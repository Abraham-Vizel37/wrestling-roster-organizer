#!/usr/bin/env python3
"""Seed WWE 2K24 reference data into the Wrestling Roster Organizer API.

Reads the reference XLSX and POSTs all data to the running FastAPI backend.
Usage: python3 seed.py [--port 8000]
"""

import json
import sys
from pathlib import Path

import openpyxl
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000/api"

# ── Known alignments from Full Roster sheet ──
KNOWN_ALIGNMENTS = {
    "Alba Fyre": "face", "Alexa Bliss": "face", "Andre Chase": "face",
    "Angel Garza": "heel", "Angelo Dawkins": "face", "Apollo Crews": "face",
    "Ashante Thee Adonis": "face", "Asuka": "face", "Austin Theory": "heel",
    "Axiom": "face", "Baron Corbin": "heel", "Batista": "face",
    "Bayley": "heel", "Becky Lynch": "face", "Beth Pheonix": "face",
    "Bianca Belair": "face", "Big E": "face", "Blair Davenport": "heel",
    "Bobby Lashley": "face", "Boogeyman": "heel", "Braun Strowman": "face",
    "Bray Wyatt": "heel", "Bret Hart": "face", "British Bulldog": "face",
    "Bron Breakker": "face", "Bronson Reed": "heel", "Brooks Jensen": "face",
    "Brutus Creed": "face", "Butch": "face", "Cactus Jack": "face",
    "Cameron Grimes": "face", "Candice LeRae": "face", "Carmella": "heel",
    "Carmelo Hayes": "face", "Cedric Alexander": "face", "Chad Gable": "face",
    "Channing Stacks Lorenzo": "face", "Charlotte": "face", "Chelsea Green": "heel",
    "Chyna": "face", "Cody Rhodes": "face", "Cora Jade": "face",
    "Cruz Del Toro": "face", "Dakota Kai": "heel", "Damien Priest": "heel",
    "Damon Kemp": "face", "Dexter Lumis": "heel", "Dijak": "heel",
    "Doink The Clown": "heel", "Dominik Mysterio": "heel", "Drew Gulak": "heel",
    "Drew McIntyre": "face", "Dude Love": "face", "Duke Hudson": "face",
    "Dusty Rhodes": "face", "Eddie Guerrero": "face", "Elton Prince": "heel",
    "Erik": "heel", "Eve Torres": "face", "Faarooq": "face",
    "Fallon Henley": "face", "Finn Balor": "heel", "George Steele": "heel",
    "Gigi Dolin": "heel", "Giovanni Vinci": "heel", "Grayson Waller": "heel",
    "Gunther": "heel", "Harley Race": "face", "Hollywood Hogan": "heel",
    "Humberto Carrillo": "face", "Ilja Dragunov": "face", "Indi Hartwell": "face",
    "Isla Dawn": "heel", "Ivar": "face", "Ivy Nile": "face",
    "IYO Sky": "face", "Jacy Jayne": "heel", "Jake Roberts": "heel",
    "JBL": "heel", "JD McDonaugh": "heel", "Jerry Lawler": "face",
    "Jey Uso": "face", "Jim Neidhart": "face", "Jimmy Uso": "heel",
    "Jinder Mahal": "heel", "Joaquin Wilde": "face", "Joe Coffey": "heel",
    "Joe Gacy": "heel", "John Cena": "face", "Johnny Gargano": "face",
    "Josh Briggs": "face", "Julius Creed": "face", "Kane": "heel",
    "Karl Anderson": "heel", "Karrion Kross": "heel", "Katana Chance": "face",
    "Kayden Carter": "face", "Ken Shamrock": "face", "Kevin Nash": "heel",
    "Kevin Owens": "face", "Kit Wilson": "heel", "Kofi Kingston": "face",
    "Kurt Angle": "face", "LA Knight": "face", "Lita": "face",
    "Liv Morgan": "face", "Logan Paul": "heel", "Ludwig Kaiser": "heel",
    "Luke Gallows": "heel", "Macho Man": "face", "Mankind": "face",
    "Mark Coffey": "face", "Maryse": "heel", "Maxxine Dupri": "face",
    "Michin": "face", "Miz": "heel", "Molly Holly": "face",
    "Montez Ford": "face", "Muhammed Ali": "face", "MVP": "heel",
    "Natalya": "face", "Nathan Frazer": "face", "Nikki Cross": "face",
    "Nikkita Lyons": "face", "Noam Dar": "heel", "Omos": "heel",
    "Otis": "face", "Piper Niven": "heel", "R-Truth": "face",
    "Randy Orton": "face", "Raquel Rodriguez": "face", "Ravishing Rick Rude": "heel",
    "Rey Mysterio": "face", "Rhea Ripley": "heel", "Ricochet": "face",
    "Rick Steiner": "face", "Ricky Steamboat": "face", "Ridge Holland": "face",
    "Rikishi": "face", "Rob Van Dam": "face", "Robert Roode": "heel",
    "Roman Reigns": "heel", "Ronda Rousey": "heel", "Rowdy Roddy Piper": "face",
    "Roxanne Perez": "face", "Sami Zayn": "face", "Sanga": "face",
    "Santos Escobar": "heel", "Scarlett": "heel", "Scott Hall": "heel",
    "Scott Steiner": "heel", "Scrypts": "heel", "Seth Rollins": "face",
    "Shane McMahon": "heel", "Shawn Michaels": "face", "Shayna Baszler": "heel",
    "Sheamus": "face", "Shinsuke Nakamura": "heel", "Shotzi": "face",
    "Solo Sikoa": "heel", "Sonya Deville": "heel", "Stacy Keibler": "face",
    "Stardust": "heel", "Stone Cold": "face", "Superstar Billy Graham": "face",
    "Syxx": "heel", "Tamina": "heel", "Ted Dibiase": "heel",
    "Tegan Nox": "face", "The Hurricane": "face", "The Miz": "heel",
    "The Rock": "face", "Thea Hail": "face", "Tiffany Stratton": "face",
    "Tomasso Ciampa": "heel", "Tony D'Angelo": "face", "Trick Williams": "face",
    "Trish Stratus": "face", "Triple-H": "heel", "Tyler Bate": "face",
    "Tyler Breeze": "heel", "Umaga": "heel", "Uncle Howdy": "heel",
    "Undertaker": "heel", "Vader": "heel", "Valhalla": "heel",
    "Veer Mahan": "heel", "Wade Barrett": "heel", "Wendy Choo": "face",
    "Wes Lee": "face", "William Regal": "face", "Wolfgang": "face",
    "Xavier Woods": "face", "Xia Li": "face", "Yokozuna": "heel",
    "Zelina Vega": "face", "Zoey Stark": "face",
    "Akira Tozawa": "face",
}

FEMALES = {
    "Alba Fyre", "Alexa Bliss", "Asuka", "Bayley", "Becky Lynch", "Beth Pheonix",
    "Bianca Belair", "Blair Davenport", "Candice LeRae", "Carmella", "Charlotte",
    "Chelsea Green", "Chyna", "Cora Jade", "Dakota Kai", "Eve Torres",
    "Fallon Henley", "Gigi Dolin", "Indi Hartwell", "Isla Dawn", "Ivy Nile",
    "IYO Sky", "Jacy Jayne", "Katana Chance", "Kayden Carter", "Lita", "Liv Morgan",
    "Maryse", "Maxxine Dupri", "Michin", "Molly Holly", "Natalya", "Nikki Cross",
    "Nikkita Lyons", "Piper Niven", "Raquel Rodriguez", "Rhea Ripley", "Ronda Rousey",
    "Roxanne Perez", "Scarlett", "Shayna Baszler", "Shotzi", "Sonya Deville",
    "Stacy Keibler", "Tamina", "Tegan Nox", "Thea Hail", "Tiffany Stratton",
    "Trish Stratus", "Valhalla", "Wendy Choo", "Xia Li", "Zelina Vega", "Zoey Stark",
}

TEAMS_FACTIONS = [
    ("A-Town Down Under", ["Austin Theory", "Grayson Waller"]),
    ("Alpha Academy", ["Chad Gable", "Otis", "Maxxine Dupri", "Akira Tozawa"]),
    ("Awesome Truth", ["Miz", "R-Truth"]),
    ("Bloodline", ["Roman Reigns", "Jimmy Uso", "Solo Sikoa", "The Rock"]),
    ("Brawling Brutes", ["Sheamus", "Butch", "Ridge Holland"]),
    ("Brooks/Jensen/Fallon", ["Brooks Jensen", "Josh Briggs", "Fallon Henley"]),
    ("Cedric/Ashante", ["Cedric Alexander", "Ashante Thee Adonis"]),
    ("Chase U", ["Andre Chase", "Duke Hudson", "Thea Hail"]),
    ("DIY", ["Tomasso Ciampa", "Johnny Gargano"]),
    ("Imperium", ["Gunther", "Ludwig Kaiser", "Giovanni Vinci"]),
    ("Judgment Day", ["Finn Balor", "Damien Priest", "Dominik Mysterio", "Rhea Ripley", "JD McDonaugh"]),
    ("Team Angle", ["Drew Gulak", "Damon Kemp"]),
    ("KO/Sami", ["Kevin Owens", "Sami Zayn"]),
    ("Legado Del Phantasma", ["Santos Escobar", "Angel Garza", "Humberto Carrillo", "Zelina Vega"]),
    ("LWO", ["Rey Mysterio", "Cruz Del Toro", "Joaquin Wilde", "Zelina Vega"]),
    ("MVP/Omos", ["MVP", "Omos"]),
    ("New Day", ["Big E", "Kofi Kingston", "Xavier Woods"]),
    ("NWO", ["Hollywood Hogan", "Scott Hall", "Kevin Nash", "Syxx"]),
    ("Piper Niven/Chelsea Green", ["Piper Niven", "Chelsea Green"]),
    ("Pretty Deadly", ["Elton Prince", "Kit Wilson"]),
    ("Regal/Bate", ["William Regal", "Tyler Bate"]),
    ("Street Profits", ["Angelo Dawkins", "Montez Ford"]),
    ("The Pride", ["Bobby Lashley", "Montez Ford", "Angelo Dawkins"]),
    ("Usos", ["Jey Uso", "Jimmy Uso"]),
    ("Viking Raiders", ["Erik", "Ivar"]),
    ("Way", ["Candice LeRae", "Indi Hartwell", "Johnny Gargano"]),
]


BRAND_COLORS = {
    "RAW": "#e02424",
    "SmackDown": "#005baa",
    "NXT": "#ffd700",
}


def api(method, path, data=None):
    """Thin HTTP client — no external deps."""
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  ⛔ {method} {path} → {e.code}: {e.read().decode()[:200]}")
        return None
    except Exception as e:
        print(f"  ⛔ {method} {path} → {e}")
        return None


def parse_roster():
    """Parse Drafted Roster sheet into structured data."""
    wb = openpyxl.load_workbook(
        "/root/.hermes/cache/documents/doc_068b1e4390d8_WWE 2K24.xlsx",
        data_only=True
    )
    ws = wb["Drafted Roster"]

    # Read all rows
    rows = list(ws.iter_rows(values_only=True))

    # Parse brand/gender columns
    # Row 0 (1-indexed Row 1): brand headers: RAW, RAW, SMDN, SMDN, NXT, NXT
    # Row 1 (1-indexed Row 2): gender: Men, Women, Men, Women, Men, Women
    brands = ["RAW", "SmackDown", "NXT"]
    brand_col_map = {
        0: "RAW", 1: "RAW",       # cols A,B → RAW (Men, Women)
        2: "SmackDown", 3: "SmackDown",  # cols C,D → SmackDown
        4: "NXT", 5: "NXT",       # cols E,F → NXT
    }

    roster = {"RAW": {"Men": [], "Women": []},
              "SmackDown": {"Men": [], "Women": []},
              "NXT": {"Men": [], "Women": []}}

    # Data rows are rows 2-27 (0-indexed), which is rows 3-28 in spreadsheet
    # Find the actual data — it starts after the header row
    header_row = None
    for i, row in enumerate(rows):
        if row and str(row[0]).strip() == "RAW":
            header_row = i
            break

    if header_row is None:
        print("ERROR: Could not find header row in Drafted Roster")
        sys.exit(1)

    # Gender row is header_row + 1
    gender_row = header_row + 1

    # Data starts at header_row + 2
    data_start = header_row + 2

    # Read until we hit empty or Teams/Factions
    seen_names = set()
    for i in range(data_start, len(rows)):
        row = rows[i]
        if row is None:
            continue
        first = str(row[0]).strip() if row[0] else ""
        if not first or first.startswith("Teams") or first == "None":
            break

        for col in range(min(6, len(row))):
            name = str(row[col]).strip() if row[col] else ""
            if not name or name == "None" or name in ("",) or len(name) < 2:
                continue

            brand = brand_col_map[col]
            gender = "Women" if col in (1, 3, 5) else "Men"
            key = (name.lower().replace("'", "").replace(" ", ""), brand)

            # Avoid duplicates
            dedup_key = name.lower().replace("'", "").replace(" ", "")
            if dedup_key not in seen_names or True:  # Allow brand-level dupes
                roster[brand][gender].append(name)
                seen_names.add(dedup_key)

    return roster


def seed():
    print("╔════════════════════════════════════════════╗")
    print("║  WWE 2K24 Roster Seed                      ║")
    print("╚════════════════════════════════════════════╝")

    # ── 1. Create Game ──
    print("\n── Game ──")
    game = api("POST", "/games", {
        "name": "WWE 2K24",
        "platform": "Multi (PS5/Xbox/PC)",
        "year": 2024,
        "description": "Full WWE 2K24 roster — RAW, SmackDown, NXT"
    })
    if not game:
        print("Trying to match existing game...")
        games = api("GET", "/games")
        if games:
            game = games[0]
    GAME_ID = game["id"]
    print(f"  Game ID {GAME_ID}: {game['name']}")

    # ── 2. Create Brands ──
    print("\n── Brands ──")
    brand_ids = {}
    for name in ["RAW", "SmackDown", "NXT"]:
        b = api("POST", "/brands", {
            "name": name,
            "game_id": GAME_ID,
            "color": BRAND_COLORS.get(name, "#5865f2"),
            "gm": {"RAW": "Adam Pearce", "SmackDown": "Nick Aldis", "NXT": "Ava"}[name],
            "show_status": "active",
            "sort_order": {"RAW": 1, "SmackDown": 2, "NXT": 3}[name],
        })
        if b:
            brand_ids[name] = b["id"]
            print(f"  {name} → ID {b['id']}")

    # ── 3. Parse and Create Wrestlers ──
    print("\n── Wrestlers ──")
    roster = parse_roster()
    wrestler_ids = {}
    count = 0

    for brand_name in ["RAW", "SmackDown", "NXT"]:
        brand_id = brand_ids.get(brand_name)
        for gender in ["Men", "Women"]:
            for name in roster[brand_name][gender]:
                gender_key = gender.lower()
                alignment = KNOWN_ALIGNMENTS.get(name, "face")
                power = 75  # default

                # Power ratings based on known top stars
                power_map = {
                    "Roman Reigns": 98, "Cody Rhodes": 95, "Seth Rollins": 93,
                    "Bianca Belair": 95, "Rhea Ripley": 92, "Becky Lynch": 92,
                    "Charlotte": 93, "Gunther": 94, "The Rock": 96,
                    "Undertaker": 95, "Stone Cold": 94, "John Cena": 93,
                    "Brock Lesnar": 96, "Randy Orton": 91, "Triple-H": 92,
                    "Drew McIntyre": 90, "Damien Priest": 88, "Finn Balor": 87,
                    "Kevin Owens": 88, "Sami Zayn": 86, "Jey Uso": 85,
                    "LA Knight": 87, "Logan Paul": 84,
                }
                if name in power_map:
                    power = power_map[name]
                elif name in KNOWN_ALIGNMENTS and gender_key == "men":
                    power = 80
                elif gender_key == "women":
                    power = 78

                w = api("POST", "/wrestlers", {
                    "name": name,
                    "game_id": GAME_ID,
                    "brand_id": brand_id,
                    "gender": gender_key,
                    "alignment": alignment,
                    "status": "active",
                    "power": power,
                    "is_caw": False,
                })
                if w:
                    wrestler_ids[name.lower().replace("'", "").replace(" ", "")] = w["id"]
                    count += 1

    print(f"  Total: {count} wrestlers seeded")

    # ── 4. Create Tag Teams & Stables ──
    print("\n── Tag Teams & Stables ──")

    def find_wrestler_id(name):
        key = name.lower().replace("'", "").replace(" ", "")
        # Try partial match
        for k, wid in wrestler_ids.items():
            if key in k or k in key:
                return wid
        return None

    for team_name, members in TEAMS_FACTIONS:
        if len(members) < 2:
            continue

        member_ids = [find_wrestler_id(m) for m in members]
        member_ids = [m for m in member_ids if m is not None]

        if len(member_ids) < 2:
            continue

        # Determine brand from members
        guessed_brand = None
        for m_name in members:
            m_key = m_name.lower().replace("'", "").replace(" ", "")
            for brand_name in ["RAW", "SmackDown", "NXT"]:
                for gender in ["Men", "Women"]:
                    if m_name in roster[brand_name][gender]:
                        guessed_brand = brand_ids.get(brand_name)
                        break
                if guessed_brand:
                    break
            if guessed_brand:
                break

        if len(member_ids) <= 2:
            # Tag team
            t = api("POST", "/tag-teams", {
                "name": team_name,
                "game_id": GAME_ID,
                "brand_id": guessed_brand,
                "member1_id": member_ids[0],
                "member2_id": member_ids[1] if len(member_ids) > 1 else None,
                "alignment": "face" if team_name not in ("Bloodline", "Judgment Day", "Imperium",
                    "NWO", "Pretty Deadly", "A-Town Down Under") else "heel",
                "status": "active",
            })
            if t:
                print(f"  Tag Team: {team_name}")
        else:
            # Stable (3+ members)
            s = api("POST", "/stables", {
                "name": team_name,
                "game_id": GAME_ID,
                "brand_id": guessed_brand,
                "status": "active",
                "member_ids": member_ids,
            })
            if s:
                print(f"  Stable: {team_name} ({len(member_ids)} members)")

    # ── 5. Create Championships ──
    print("\n── Championships ──")

    def wid(name):
        return find_wrestler_id(name)

    titles = [
        ("WWE Championship", "SmackDown", "world", "Roman Reigns"),
        ("World Heavyweight Championship", "RAW", "world", "Seth Rollins"),
        ("NXT Championship", "NXT", "world", None),
        ("Intercontinental Championship", "SmackDown", "midcard", "Gunther"),
        ("United States Championship", "RAW", "midcard", None),
        ("NXT North American Championship", "NXT", "midcard", None),
        ("Undisputed WWE Tag Team Championship", "SmackDown", "tag", None),
        ("World Tag Team Championship", "RAW", "tag", None),
        ("NXT Tag Team Championship", "NXT", "tag", None),
        ("WWE Women's Championship", "SmackDown", "womens_world", "Bayley"),
        ("Women's World Championship", "RAW", "womens_world", "Rhea Ripley"),
        ("NXT Women's Championship", "NXT", "womens_world", None),
        ("WWE Women's Intercontinental Championship", "SmackDown", "womens_midcard", None),
        ("WWE Women's United States Championship", "RAW", "womens_midcard", None),
        ("NXT Women's North American Championship", "NXT", "womens_midcard", None),
        ("WWE Women's Tag Team Championship", None, "womens_tag", None),
    ]

    for title_name, brand_name, tier, holder in titles:
        brand_id = brand_ids.get(brand_name) if brand_name else None
        holder_id = wid(holder) if holder else None
        c = api("POST", "/championships", {
            "name": title_name,
            "game_id": GAME_ID,
            "brand_id": brand_id,
            "tier": tier,
            "holder1_id": holder_id,
            "is_vacant": holder is None,
        })
        if c:
            holder_str = holder or "Vacant"
            print(f"  {title_name} [{tier}] → {holder_str}")

    print("\n╔════════════════════════════════════════════╗")
    print("║  Seed complete!                           ║")
    print(f"║  {count} wrestlers                          ║")
    print(f"║  {len(TEAMS_FACTIONS)} teams/factions             ║")
    print(f"║  {len(titles)} championships                   ║")
    print("╚════════════════════════════════════════════╝")
    print(f"\n→ Dashboard: http://127.0.0.1:8000/")


if __name__ == "__main__":
    seed()
