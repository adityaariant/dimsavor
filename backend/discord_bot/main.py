import os
import discord
from discord.ext import commands, tasks
import httpx
import asyncio
from dotenv import load_dotenv
import re
import datetime

load_dotenv()

# Discord Bot Setup
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

# Config Environment Variables
API_BASE_URL = os.getenv("API_BASE_URL")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_BOT_EMAIL = os.getenv("SUPABASE_BOT_EMAIL")
SUPABASE_BOT_PASSWORD = os.getenv("SUPABASE_BOT_PASSWORD")

DISCORD_CHANNEL_ID = os.getenv("DISCORD_CHANNEL_ID")
DISCORD_SUMMARY_CHANNEL_ID = os.getenv("DISCORD_SUMMARY_CHANNEL_ID")

# In-memory authentication token cache
cached_token = None

# Helper functions for Supabase JWT Auth & HTTP Request handling
async def get_auth_headers(force_refresh=False):
    """Obtains a valid JWT token from Supabase Auth using password flow."""
    global cached_token
    if not cached_token or force_refresh:
        if not SUPABASE_URL or not SUPABASE_ANON_KEY or not SUPABASE_BOT_EMAIL or not SUPABASE_BOT_PASSWORD:
            raise Exception("Missing Supabase credentials in environment variables.")
        
        async with httpx.AsyncClient() as client:
            url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=password"
            headers = {
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            }
            body = {
                "email": SUPABASE_BOT_EMAIL,
                "password": SUPABASE_BOT_PASSWORD
            }
            print(f"Logging in to Supabase as {SUPABASE_BOT_EMAIL}...")
            resp = await client.post(url, headers=headers, json=body)
            if resp.status_code == 200:
                data = resp.json()
                cached_token = data.get("access_token")
                print("Successfully logged in and retrieved new JWT token.")
            else:
                print(f"Supabase login failed: {resp.status_code} - {resp.text}")
                raise Exception(f"Supabase login failed: {resp.text}")
                
    return {
        "Authorization": f"Bearer {cached_token}",
        "Content-Type": "application/json"
    }

async def make_api_request(method: str, endpoint: str, **kwargs):
    """Wrapper for FastAPI backend API requests with automatic 401 token refresh."""
    try:
        headers = await get_auth_headers()
    except Exception as e:
        print(f"Auth header generation error: {e}")
        raise

    url = f"{API_BASE_URL.rstrip('/')}/{endpoint.lstrip('/')}"
    
    async with httpx.AsyncClient() as client:
        resp = await client.request(method, url, headers=headers, **kwargs)
        if resp.status_code == 401:
            print("Received 401 from backend. Attempting to refresh Supabase token and retry...")
            try:
                headers = await get_auth_headers(force_refresh=True)
                resp = await client.request(method, url, headers=headers, **kwargs)
            except Exception as e:
                print(f"Token refresh and retry failed: {e}")
                raise
        return resp

# PO Session helper
async def get_active_session_info():
    """Fetch the currently active PO session ID and a formatted info string."""
    try:
        resp = await make_api_request("GET", "/sessions/")
        if resp.status_code == 200:
            sessions = resp.json()
            for s in sessions:
                if s.get("status") == "Active":
                    id_po = s.get("id_po")
                    tgl_buka = s.get("tanggal_buka", "")
                    tgl_tutup = s.get("tanggal_tutup", "")
                    name = f"PO Sesi #{id_po} ({tgl_buka} s.d. {tgl_tutup})"
                    return id_po, name
    except Exception as e:
        print(f"Error fetching active session: {e}")
    return None, None

# Message splitting logic for batch parsing
def split_raw_text_into_orders(raw_text: str) -> list[str]:
    """Splits a single message into multiple individual order blocks if pasted as a batch."""
    pattern = re.compile(r'^\s*Nama\s*[:\-]', re.IGNORECASE | re.MULTILINE)
    
    # Find all starting indices of "Nama:" or "Nama -" at the start of a line
    matches = list(pattern.finditer(raw_text))
    if not matches:
        return [raw_text]
        
    chunks = []
    for i in range(len(matches)):
        start = matches[i].start()
        end = matches[i+1].start() if i + 1 < len(matches) else len(raw_text)
        chunk = raw_text[start:end].strip()
        if chunk:
            chunks.append(chunk)
            
    return chunks

# Embed formatting logic
def build_order_embed(order, idx, total_chunks):
    """Generates a styled Discord Embed representing the parsed order review."""
    unmatched = order.get('unmatched_tokens', [])
    color = discord.Color.orange() if unmatched else discord.Color.green()
    
    title = f"Review Pesanan ({idx}/{total_chunks})"
    description = (
        f"**Nama:** {order.get('nama_pelanggan', 'Tidak diketahui')}\n"
        f"**Alamat:** {order.get('alamat', 'Tidak diketahui')} (Tag: `{order.get('area_tag', 'Lainnya')}`)\n"
        f"**Jadwal Kirim:** {order.get('jadwal_kirim_request', 'Tidak diketahui')}\n"
        f"**Metode Bayar:** {order.get('metode_bayar', 'BCA')}\n\n"
        f"**Daftar Item:**\n"
    )
    
    for item in order.get('items', []):
        name = item.get('nama_produk', 'Tidak diketahui')
        qty = item.get('qty', 1)
        subtotal = item.get('subtotal', 0)
        topping = item.get('topping')
        topping_str = f" (Topping: {topping})" if topping else ""
        
        if item.get('_unmatched'):
            description += f"❌ ~~{name} x{qty}~~ (Tidak dikenali)\n"
        elif item.get('is_custom_price'):
            description += f"• {name} x{qty}{topping_str} - *Harga Kustom* (Subtotal: Rp {subtotal:,})\n"
        else:
            description += f"• {name} x{qty}{topping_str} (Rp {subtotal:,})\n"
            
    matched_slot = order.get('matched_slot')
    slot_str = matched_slot.get('jadwal_teks', 'Tidak cocok') if matched_slot else 'Tidak cocok'
    
    description += (
        f"\n**Slot Delivery:** {slot_str}\n"
        f"**Ongkir:** Rp {order.get('ongkir', 0):,} (Rule: `{order.get('ongkir_rule', 'Flat')}`)\n"
        f"**Total Biaya:** **Rp {order.get('total', 0):,}**\n"
        f"**Dampak Kuota:** {order.get('quota_impact', 0)} box"
    )
    
    embed = discord.Embed(title=title, description=description, color=color)
    
    if unmatched:
        embed.add_field(
            name="⚠️ Item Tidak Dikenal", 
            value=", ".join(f"`{t}`" for t in unmatched), 
            inline=False
        )
        embed.set_footer(text="Gunakan tombol Edit untuk memperbaiki nama produk agar dikenali sistem.")
    else:
        embed.set_footer(text="Silakan klik Confirm untuk menyimpan ke database.")
        
    return embed

# Interactive confirmation buttons
class ConfirmationView(discord.ui.View):
    def __init__(self, order_data, id_po):
        super().__init__(timeout=600)
        self.order_data = order_data
        self.id_po = id_po

    @discord.ui.button(label="Confirm", style=discord.ButtonStyle.green, emoji="✅")
    async def confirm(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer(ephemeral=True)
        
        # Prepare strictly Pydantic-valid payload for POST /orders/
        matched_slot = self.order_data.get("matched_slot")
        id_slot = matched_slot.get("id_slot") if matched_slot else None
        
        payload = {
            "id_po": self.id_po,
            "nama_pelanggan": self.order_data.get("nama_pelanggan"),
            "alamat": self.order_data.get("alamat"),
            "area_tag": self.order_data.get("area_tag"),
            "jadwal_kirim_request": self.order_data.get("jadwal_kirim_request"),
            "id_slot": id_slot,
            "metode_bayar": self.order_data.get("metode_bayar"),
            "ongkir": self.order_data.get("ongkir", 0),
            "ongkir_rule": self.order_data.get("ongkir_rule"),
            "items": [
                {
                    "nama_produk": item.get("nama_produk"),
                    "qty": item.get("qty"),
                    "is_bundle": item.get("is_bundle", False),
                    "topping": item.get("topping"),
                    "subtotal": item.get("subtotal", 0)
                }
                for item in self.order_data.get("items", [])
                if not item.get("_unmatched", False)
            ]
        }
        
        try:
            resp = await make_api_request("POST", "/orders/", json=payload)
            if resp.status_code == 200 or resp.status_code == 201:
                # Disable buttons after success
                for child in self.children:
                    child.disabled = True
                await interaction.message.edit(view=self)
                await interaction.followup.send("✅ Pesanan berhasil disimpan ke database!", ephemeral=True)
            else:
                await interaction.followup.send(f"❌ Gagal menyimpan: `{resp.status_code} - {resp.text}`", ephemeral=True)
        except Exception as e:
            await interaction.followup.send(f"❌ Error: `{e}`", ephemeral=True)

    @discord.ui.button(label="Edit", style=discord.ButtonStyle.blurple, emoji="✏️")
    async def edit(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_modal(EditModal(self.order_data, self.id_po, interaction.message))

    @discord.ui.button(label="Dismiss", style=discord.ButtonStyle.grey, emoji="🗑️")
    async def dismiss(self, interaction: discord.Interaction, button: discord.ui.Button):
        try:
            await interaction.message.delete()
        except Exception as e:
            await interaction.response.send_message(f"❌ Gagal menghapus pesan review: `{e}`", ephemeral=True)

# Modal Form for editing parsed order fields
class EditModal(discord.ui.Modal):
    def __init__(self, order_data, id_po, message_to_update):
        super().__init__(title="Edit Pesanan")
        self.order_data = order_data
        self.id_po = id_po
        self.message_to_update = message_to_update
        
        # Format existing items as a comma-separated string for easy editing
        items_str = ", ".join(
            f"{item.get('nama_produk', '')} x{item.get('qty', 1)}"
            for item in order_data.get('items', [])
        )
        
        self.add_item(discord.ui.TextInput(
            label="Nama Pelanggan", 
            default=str(order_data.get('nama_pelanggan', '')),
            max_length=100
        ))
        self.add_item(discord.ui.TextInput(
            label="Alamat", 
            default=str(order_data.get('alamat', '')),
            max_length=200
        ))
        self.add_item(discord.ui.TextInput(
            label="Pesanan (Pisahkan dengan koma)", 
            default=items_str,
            max_length=300
        ))
        self.add_item(discord.ui.TextInput(
            label="Waktu / Jadwal Kirim", 
            default=str(order_data.get('jadwal_kirim_request', '')),
            max_length=100,
            required=False
        ))
        self.add_item(discord.ui.TextInput(
            label="Metode Bayar", 
            default=str(order_data.get('metode_bayar', 'BCA')),
            max_length=50,
            required=False
        ))

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        
        # Reconstruct standard WA order format text from edited inputs
        raw_text = (
            f"Nama: {self.children[0].value}\n"
            f"Alamat: {self.children[1].value}\n"
            f"Pesanan: {self.children[2].value}\n"
            f"Waktu: {self.children[3].value}\n"
            f"Bayar: {self.children[4].value}"
        )
        
        try:
            # Re-parse via backend to resolve new locations, slots, and quantities
            resp = await make_api_request(
                "POST", 
                "/parse", 
                json={"raw_text": raw_text, "id_po": self.id_po}
            )
            
            if resp.status_code == 200:
                new_order_data = resp.json()
                
                # Update the original review message with the new embed and view
                embed = build_order_embed(new_order_data, 1, 1)
                view = ConfirmationView(new_order_data, self.id_po)
                
                await self.message_to_update.edit(embed=embed, view=view)
                await interaction.followup.send("✅ Pesanan berhasil diperbarui. Silakan tinjau kembali lalu klik Confirm.", ephemeral=True)
            else:
                await interaction.followup.send(f"❌ Gagal memparsing ulang: `{resp.text}`", ephemeral=True)
        except Exception as e:
            await interaction.followup.send(f"❌ Terjadi kesalahan saat memproses edit: `{e}`", ephemeral=True)

# Helper to calculate the 7-metric production summary
def calculate_production_summary(decomposed_items: list[dict]) -> dict:
    box_mentai = 0
    box_ori = 0
    box_mix = 0
    pcs_mentai = 0
    pcs_ori = 0
    cup_bb = 0
    cup_bk = 0

    for item in decomposed_items:
        name = item.get("nama_produk") or ""
        qty = item.get("qty") or 0
        lower_name = name.lower()
        source_bundle = item.get("source_bundle") or ""

        if source_bundle == "BAdil":
            if "bacar besar" in lower_name:
                box_mix += qty
                cup_bb += qty
            elif "original" in lower_name:
                pcs_ori += qty
            elif "mentai" in lower_name:
                pcs_mentai += qty
        elif source_bundle == "BSweet":
            if "bacar besar" in lower_name:
                cup_bb += qty
        else:
            if lower_name == "dimsum mentai 6pcs" or ("mentai" in lower_name and "6pcs" in lower_name):
                box_mentai += qty
                pcs_mentai += qty * 6
            elif lower_name == "dimsum mentai 4pcs" or ("mentai" in lower_name and "4pcs" in lower_name):
                box_mentai += qty
                pcs_mentai += qty * 4
            elif lower_name == "dimsum original" or ("original" in lower_name and "pcs" not in lower_name and "(" not in lower_name):
                box_ori += qty
                pcs_ori += qty * 6
            elif "bacar besar" in lower_name or "bb" in lower_name:
                cup_bb += qty
            elif "bacar kecil" in lower_name or "bk" in lower_name:
                cup_bk += qty
            else:
                if "mentai" in lower_name:
                    pcs_mentai += qty
                elif "original" in lower_name or "ori" in lower_name:
                    pcs_ori += qty

    return {
        "box_mentai": box_mentai,
        "box_ori": box_ori,
        "box_mix": box_mix,
        "pcs_mentai": pcs_mentai,
        "pcs_ori": pcs_ori,
        "cup_bb": cup_bb,
        "cup_bk": cup_bk
    }

# Find daily summary channel helper
async def get_summary_channel():
    """Locates the channel designated for daily summaries (via ID or name fallback)."""
    if DISCORD_SUMMARY_CHANNEL_ID:
        try:
            return await bot.fetch_channel(int(DISCORD_SUMMARY_CHANNEL_ID))
        except Exception as e:
            print(f"Failed to fetch summary channel by ID: {e}")
            
    # Fallback: Search in all guilds for text channel named 'daily-summary'
    for guild in bot.guilds:
        for channel in guild.text_channels:
            if channel.name == "daily-summary":
                return channel
    return None

# Formats and sends daily summary
async def send_daily_summary(channel):
    """Fetches decomposed items from the active session and formats the 7-metric summary."""
    # 1. Verify active session exists
    id_po, session_name = await get_active_session_info()
    if not id_po:
        await channel.send("❌ Tidak ada Sesi PO yang aktif saat ini. Ringkasan tidak dapat dibuat.")
        return

    # 2. Get kitchen board data (decomposed items)
    try:
        resp = await make_api_request("GET", f"/kitchen/?session_id={id_po}")
        if resp.status_code != 200:
            await channel.send(f"❌ Gagal mengambil data produksi dari backend: `{resp.status_code} - {resp.text}`")
            return
        data = resp.json()
        decomposed_items = data.get("items", [])
    except Exception as e:
        await channel.send(f"❌ Terjadi kesalahan saat memanggil backend: `{e}`")
        return

    # 3. Calculate metrics
    summary = calculate_production_summary(decomposed_items)
    
    # 4. Build embed output
    embed = discord.Embed(
        title=f"📊 Ringkasan Produksi Harian - {session_name}",
        description=f"Berikut adalah rekapitulasi produksi untuk sesi PO aktif per hari ini ({datetime.date.today().strftime('%d %B %Y')}):",
        color=discord.Color.gold()
    )
    
    embed.add_field(
        name="🍱 Box Dimsum",
        value=(
            f"• **Mentai:** {summary['box_mentai']} box ({summary['pcs_mentai']} pcs)\n"
            f"• **Original:** {summary['box_ori']} box ({summary['pcs_ori']} pcs)\n"
            f"• **Mix:** {summary['box_mix']} box ({summary['box_mix'] * 3} Ori / {summary['box_mix'] * 3} Mentai)"
        ),
        inline=False
    )
    
    embed.add_field(
        name="🥤 Bacar (Bakso Bakar)",
        value=(
            f"• **Bacar Besar (BB):** {summary['cup_bb']} cup\n"
            f"• **Bacar Kecil (BK):** {summary['cup_bk']} cup"
        ),
        inline=False
    )
    
    total_boxes = summary['box_mentai'] + summary['box_ori'] + summary['box_mix']
    embed.add_field(
        name="📈 Total Produksi Sesi Ini",
        value=f"• **Total Box Dimsum:** {total_boxes} box\n• **Total Bacar:** {summary['cup_bb'] + summary['cup_bk']} cup",
        inline=False
    )
    
    embed.set_footer(text="Dimsavor Automation Bot")
    embed.timestamp = datetime.datetime.now()
    
    await channel.send(embed=embed)

# Scheduled daily summary background loop
last_summary_date = None

@tasks.loop(minutes=30)
async def check_daily_summary():
    """Checks the current time periodically and posts the summary at 21:00 WIB (GMT+7)."""
    global last_summary_date
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))) # GMT+7 (WIB)
    
    if now.hour == 21 and (last_summary_date is None or last_summary_date != now.date()):
        # Check if an active session exists first
        id_po, _ = await get_active_session_info()
        if id_po:
            summary_channel = await get_summary_channel()
            if summary_channel:
                print(f"Triggering scheduled daily summary for {now.date()}")
                await send_daily_summary(summary_channel)
                last_summary_date = now.date()
            else:
                print("Scheduled daily summary skipped: No #daily-summary channel discovered.")
        else:
            print("Scheduled daily summary skipped: No active PO session.")

# Bot Events
@bot.event
async def on_ready():
    print(f'Logged in as {bot.user}')
    try:
        await bot.change_presence(activity=discord.Activity(type=discord.ActivityType.watching, name="orders..."))
    except Exception as e:
        print(f"Failed to set presence: {e}")
    
    # Start the daily summary task loop
    if not check_daily_summary.is_running():
        check_daily_summary.start()

@bot.event
async def on_message(message):
    # Process prefixed commands first
    await bot.process_commands(message)

    if message.author == bot.user:
        return

    # Check if the channel is the order inbox
    is_inbox = False
    if DISCORD_CHANNEL_ID and str(message.channel.id) == DISCORD_CHANNEL_ID:
        is_inbox = True
    elif message.channel.name == "order-inbox":
        is_inbox = True

    if not is_inbox:
        return

    # We only parse messages that contain order-like fields to avoid spam trigger
    if not re.search(r'Pesanan\s*[:\-]', message.content, re.IGNORECASE):
        return

    async with message.channel.typing():
        try:
            # 1. Fetch active session ID
            id_po, session_name = await get_active_session_info()
            if not id_po:
                await message.channel.send("❌ Gagal memproses: **Tidak ada Sesi PO yang aktif saat ini.** Silakan buat sesi PO baru di website.")
                return

            # 2. Split batch messages into individual order raw texts
            order_chunks = split_raw_text_into_orders(message.content)
            
            # 3. Call backend parser and reply with confirmations
            for idx, chunk in enumerate(order_chunks):
                resp = await make_api_request(
                    "POST", 
                    "/parse", 
                    json={"raw_text": chunk, "id_po": id_po}
                )
                
                if resp.status_code == 200:
                    order_data = resp.json()
                    embed = build_order_embed(order_data, idx + 1, len(order_chunks))
                    view = ConfirmationView(order_data, id_po)
                    await message.channel.send(embed=embed, view=view)
                else:
                    await message.channel.send(f"❌ Gagal memparsing bagian order #{idx + 1}: `{resp.text}`")
                    
        except Exception as e:
            await message.channel.send(f"❌ Terjadi kesalahan sistem saat parsing: `{e}`")

# Bot Prefix Commands
@bot.command(name="summary")
async def manual_summary(ctx):
    """Manually triggers the daily summary generation and posts it to the #daily-summary channel."""
    summary_channel = await get_summary_channel()
    if summary_channel:
        await ctx.send(f"🔄 Menghitung rekapitulasi produksi dan mengirimkannya ke <#{summary_channel.id}>...")
        await send_daily_summary(summary_channel)
    else:
        # Fallback to the current channel if #daily-summary is not found
        await ctx.send("🔄 Menghitung rekapitulasi produksi (dikirim langsung karena channel khusus tidak ditemukan)...")
        await send_daily_summary(ctx.channel)

@bot.command(name="check")
async def check_status(ctx):
    """Checks the bot status, active session, and FastAPI backend connectivity."""
    async with ctx.typing():
        try:
            # Check backend /auth/me to verify auth profile status
            auth_resp = await make_api_request("GET", "/auth/me")
            if auth_resp.status_code == 200:
                user_data = auth_resp.json()
                api_status = f"✅ Terhubung sebagai `{user_data.get('email')}` (`{user_data.get('display_name')}`)"
            else:
                api_status = f"❌ Autentikasi Gagal: `{auth_resp.status_code} - {auth_resp.text}`"
            
            # Check active session info
            id_po, session_name = await get_active_session_info()
            session_status = f"✅ Sesi Aktif: **{session_name}** (ID: {id_po})" if id_po else "❌ Tidak ada Sesi PO yang aktif."
            
            # Check configured channels
            inbox_str = f"<#{DISCORD_CHANNEL_ID}>" if DISCORD_CHANNEL_ID else "Belum diatur (menggunakan nama fallback: `#order-inbox`)"
            summary_channel = await get_summary_channel()
            summary_str = f"<#{summary_channel.id}>" if summary_channel else "Belum diatur (menggunakan nama fallback: `#daily-summary`)"

            await ctx.send(
                f"ℹ️ **Dimsavor Bot Status:**\n"
                f"• **Koneksi Backend:** {api_status}\n"
                f"• **Status Sesi PO:** {session_status}\n"
                f"• **Channel Inbox:** {inbox_str}\n"
                f"• **Channel Ringkasan:** {summary_str}"
            )
        except Exception as e:
            await ctx.send(f"❌ Terjadi kesalahan saat melakukan pengecekan: `{e}`")

# Start bot
if __name__ == "__main__":
    token = os.getenv("DISCORD_BOT_TOKEN")
    if token:
        bot.run(token)
    else:
        print("Error: DISCORD_BOT_TOKEN is not configured in environment variables.")
