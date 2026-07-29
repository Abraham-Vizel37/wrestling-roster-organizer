#!/usr/bin/env python3
"""Seed WWE 2K25 reference data into the Wrestling Roster Organizer API.

Creates the WWE 2K25 game, seeds all brands/wrestlers/teams/titles,
and backfills remaining WWE 2K24 teams not yet in the database.
Usage: python3 scripts/seed_wwe2k25.py
"""

import json
import sqlite3
import sys
from pathlib import Path

import openpyxl
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000/api"

# ── Known alignments (2K24 + 2K25 additions) ──
KNOWN_ALIGNMENTS = {
    # 2K24 carryovers
    "Alba Fyre": "face", "Alexa Bliss": "face", "Andre Chase": "face",
    "Angel Garza": "heel", "Angelo Dawkins": "face", "Apollo Crews": "face",
    "Ashante Thee Adonis": "face", "Asuka": "face", "Austin Theory": "heel",
    "Axiom": "face", "Baron Corbin": "heel", "Batista": "face",
    "Bayley": "face", "Becky Lynch": "face", "Beth Phoenix": "face",
    "Bianca Belair": "face", "Big E": "face", "Blair Davenport": "heel",
    "Bobby Lashley": "face", "Boogeyman": "heel", "Braun Strowman": "face",
    "Bray Wyatt": "heel", "Bret Hart": "face", "British Bulldog": "face",
    "Bron Breakker": "face", "Bronson Reed": "heel", "Brooks Jensen": "face",
    "Brutus Creed": "face", "Butch": "face", "Cactus Jack": "face",
    "Candice LeRae": "face", "Carmella": "heel",
    "Carmelo Hayes": "face", "Cedric Alexander": "face", "Chad Gable": "face",
    "Channing Stacks Lorenzo": "face", "Charlotte Flair": "face",
    "Chelsea Green": "heel", "Chyna": "face", "Cody Rhodes": "face",
    "Cora Jade": "face", "Cruz Del Toro": "face", "Dakota Kai": "heel",
    "Damian Priest": "heel", "Dexter Lumis": "heel",
    "Doink The Clown": "heel", "Dominik Mysterio": "heel",
    "Drew McIntyre": "face", "Dude Love": "face", "Duke Hudson": "face",
    "Dusty Rhodes": "face", "Eddie Guerrero": "face", "Elton Prince": "heel",
    "Erik": "heel", "Eve Torres": "face", "Faarooq": "face",
    "Fallon Henley": "face", "Finn Balor": "heel",
    "George Steele": "heel", "Gigi Dolin": "heel", "Giovanni Vinci": "heel",
    "Grayson Waller": "heel", "Gunther": "heel",
    "Harley Race": "face", "Hollywood Hogan": "heel",
    "Humberto Carrillo": "face", "Ilja Dragunov": "face",
    "Indi Hartwell": "face", "Isla Dawn": "heel", "Ivar": "face",
    "Ivy Nile": "face", "IYO Sky": "face", "Jacy Jayne": "heel",
    "Jake Roberts": "heel", "JBL": "heel", "JD McDonagh": "heel",
    "Jerry Lawler": "face", "Jey Uso": "face",
    "Jim Neidhart": "face", "Jimmy Uso": "heel",
    "Jinder Mahal": "heel", "Joaquin Wilde": "face", "Joe Coffey": "heel",
    "Joe Gacy": "heel", "John Cena": "face", "Johnny Gargano": "face",
    "Josh Briggs": "face", "Julius Creed": "face", "Kane": "heel",
    "Karl Anderson": "heel", "Karrion Kross": "heel", "Katana Chance": "face",
    "Kayden Carter": "face", "Ken Shamrock": "face", "Kevin Nash": "heel",
    "Kevin Owens": "face", "Kit Wilson": "heel", "Kofi Kingston": "face",
    "Kurt Angle": "face", "LA Knight": "face", "Lita": "face",
    "Liv Morgan": "face", "Logan Paul": "heel", "Ludwig Kaiser": "heel",
    "Luke Gallows": "heel", "Macho Man Randy Savage": "face",
    "Mankind": "face", "Mark Coffey": "face", "Maryse": "heel",
    "Maxxine Dupri": "face", "Michin": "face", "Miz": "heel",
    "Molly Holly": "face", "Montez Ford": "face",
    "Muhammad Ali": "face", "MVP": "heel",
    "Natalya": "face", "Nathan Frazer": "face", "Nikki Cross": "face",
    "Nikkita Lyons": "face", "Noam Dar": "heel", "Omos": "heel",
    "Otis": "face", "Piper Niven": "heel", "R-Truth": "face",
    "Randy Orton": "face", "Raquel Rodriguez": "face",
    "Rick Rude": "heel", "Rey Mysterio": "face",
    "Rhea Ripley": "face", "Ridge Holland": "face",
    "Rikishi": "face", "Rob Van Dam": "face",
    "Roman Reigns": "heel", "Ronda Rousey": "heel",
    "Roddy Piper": "face", "Roxanne Perez": "face", "Sami Zayn": "face",
    "Santos Escobar": "heel", "Scarlett": "heel", "Scott Hall": "heel",
    "Scott Steiner": "heel", "Seth Rollins": "face",
    "Shawn Michaels": "face", "Shayna Baszler": "heel",
    "Sheamus": "face", "Shinsuke Nakamura": "heel", "Shotzi": "face",
    "Solo Sikoa": "heel", "Sonya Deville": "heel", "Stacy Keibler": "face",
    "Stardust": "heel", "Stone Cold Steve Austin": "face",
    "Billy Graham": "face", "Syxx": "heel", "Tamina": "heel",
    "Ted DiBiase": "heel", "Tegan Nox": "face", "The Hurricane": "face",
    "The Miz": "heel", "The Rock": "face", "Thea Hail": "face",
    "Tiffany Stratton": "face", "Tommaso Ciampa": "heel",
    "Tony D'Angelo": "face", "Trick Williams": "face",
    "Trish Stratus": "face", "Triple H": "heel",
    "Tyler Bate": "face", "Tyler Breeze": "heel", "Umaga": "heel",
    "Uncle Howdy": "heel", "Undertaker": "heel", "Vader": "heel",
    "Valhalla": "heel", "Veer Mahan": "heel", "Wade Barrett": "heel",
    "Wendy Choo": "face", "Wes Lee": "face", "William Regal": "face",
    "Wolfgang": "face", "Xavier Woods": "face", "Xia Li": "face",
    "Yokozuna": "heel", "Zelina Vega": "face", "Zoey Stark": "face",
    "Akira Tozawa": "face", "Ricky Steamboat": "face",

    # New 2K25 additions
    "Penta": "face", "Alex Shelley": "face", "Chris Sabin": "face",
    "Jacob Fatu": "heel", "Tama Tonga": "heel", "Tonga Loa": "heel",
    "Shawn Spears": "heel", "Naomi": "face",
    "Andrade": "face", "Jade Cargill": "face",
    "B-Fab": "face", "Dragon Lee": "face",
    "Lyra Valkyria": "face", "Oba Femi": "face",
    "Ethan Page": "heel", "Sol Ruca": "face",
    "Jaida Parker": "face", "Je'Von Evans": "face",
    "Kelani Jordan": "face", "Lash Legend": "face",
    "Jakara Jackson": "face", "Kairi Sane": "face",
    "Kiana James": "face", "Lola Vice": "face",
    "Charlie Dempsey": "heel", "Eddy Thorpe": "face",
    "Lexis King": "heel", "Oro Mensah": "face",
    "Tatum Paxley": "face", "Nia Jax": "heel",
    "Michelle McCool": "face", "Naomi": "face",
    "Pete Dunne": "heel", "Elektra Lopez": "heel",
    "Brock Lesnar": "heel",
    "Razor Ramon": "heel", "Diesel": "face",
    "Mosh": "heel", "Thrasher": "heel",
    "Abyss": "heel", "Aleister Black": "face",
    "Alundra Blayze": "face", "Bull Nakano": "heel",
    "Wild Samoan Afa": "heel", "Wild Samoan Sika": "heel",
    "Billy Gunn": "face", "X-Pac": "face",
    "Eric Bischoff": "heel", "Stephanie McMahon": "face",
    "Pat McAfee": "face", "Ultimate Warrior": "face",
    "Mr. Perfect": "face", "The Great Muta": "face",
    "Terry Funk": "face", "The Sandman": "face",
    "Headshrinker Fatu": "heel", "Headshrinker Samu": "heel",
    "Booker T": "face", "Honky Tonk Man": "heel",
    "Sensational Sherri": "heel", "Bruno Sammartino": "face",
    "Iron Sheik": "heel",
    "Bobby The Brain Heenan": "heel",
    "Captain Lou Albano": "face", "Brother Love": "face",
    "Armando Estrada": "heel",
    "Bubba Ray Dudley": "face", "D-Von Dudley": "face",
    "Andre The Giant": "face", "Akam": "heel", "Rezar": "heel",
    "Adam Pearce": "face", "Ava": "face",
    "Paul Heyman": "heel", "Shane McMahon": "face",
    "X-Pac": "face",
    "Cathy Kelley": "face",
    "Ava Moreno": "face",
}

FEMALES = {
    "Alba Fyre", "Alexa Bliss", "Asuka", "Bayley", "Becky Lynch", "Beth Phoenix",
    "Bianca Belair", "Blair Davenport", "Candice LeRae", "Carmella", "Charlotte Flair",
    "Chelsea Green", "Chyna", "Cora Jade", "Dakota Kai", "Eve Torres",
    "Fallon Henley", "Gigi Dolin", "Indi Hartwell", "Isla Dawn", "Ivy Nile",
    "IYO Sky", "Jacy Jayne", "Katana Chance", "Kayden Carter", "Lita", "Liv Morgan",
    "Maryse", "Maxxine Dupri", "Michin", "Molly Holly", "Natalya", "Nikki Cross",
    "Nikkita Lyons", "Piper Niven", "Raquel Rodriguez", "Rhea Ripley", "Ronda Rousey",
    "Roxanne Perez", "Scarlett", "Shayna Baszler", "Shotzi", "Sonya Deville",
    "Stacy Keibler", "Tamina", "Tegan Nox", "Thea Hail", "Tiffany Stratton",
    "Trish Stratus", "Valhalla", "Wendy Choo", "Xia Li", "Zelina Vega", "Zoey Stark",
    "Naomi", "Jade Cargill", "B-Fab", "Lyra Valkyria", "Sol Ruca",
    "Jaida Parker", "Kelani Jordan", "Lash Legend", "Jakara Jackson",
    "Kairi Sane", "Kiana James", "Lola Vice", "Tatum Paxley", "Nia Jax",
    "Michelle McCool", "Elektra Lopez", "Alundra Blayze", "Bull Nakano",
    "Sensational Sherri", "Stephanie McMahon",
}

# ── Brand rosters for 2K25 (active wrestlers only; legends/unlockables are omitted) ──
ROSTER_DATA = {
    "RAW": {
        "Men": [
            "AJ Styles", "Akira Tozawa", "Austin Theory", "Bron Breakker",
            "Bronson Reed", "Carlito", "Chad Gable", "CM Punk",
            "Damian Priest", "Dominik Mysterio", "Dragon Lee", "Drew McIntyre",
            "Erik", "Finn Balor", "Gunther", "Ivar", "JD McDonagh",
            "Jey Uso", "Julius Creed", "Karl Anderson", "Kofi Kingston",
            "Luke Gallows", "Ludwig Kaiser", "Otis", "Penta",
            "Randy Orton", "Rey Mysterio", "Sami Zayn", "Seth Rollins",
            "Sheamus", "The Miz", "Tommaso Ciampa", "Xavier Woods",
            "Ilja Dragunov", "Brutus Creed", "Tyler Bate", "Pete Dunne",
            "R-Truth",
        ],
        "Women": [
            "Alba Fyre", "Asuka", "Bayley", "Candice LeRae", "Dakota Kai",
            "Isla Dawn", "IYO Sky", "Kairi Sane", "Katana Chance",
            "Kayden Carter", "Kiana James", "Liv Morgan", "Lyra Valkyria",
            "Maxxine Dupri", "Natalya", "Nikki Cross", "Piper Niven",
            "Raquel Rodriguez", "Rhea Ripley", "Shayna Baszler", "Valhalla",
            "Zelina Vega", "Zoey Stark", "Ivy Nile",
        ],
    },
    "SmackDown": {
        "Men": [
            "Andrade", "Angel Garza", "Apollo Crews", "Berto",
            "Braun Strowman", "Carmelo Hayes", "Cody Rhodes", "Elton Prince",
            "Giovanni Vinci", "Grayson Waller", "Jacob Fatu", "Jimmy Uso",
            "Joaquin Wilde", "John Cena", "Kevin Owens", "Kit Wilson",
            "LA Knight", "Logan Paul", "Montez Ford", "Randy Orton",
            "Roman Reigns", "Santos Escobar", "Shinsuke Nakamura",
            "Solo Sikoa", "Tama Tonga", "Tonga Loa", "Alex Shelley",
            "Chris Sabin", "Angelo Dawkins", "Cruz Del Toro",
        ],
        "Women": [
            "Alexa Bliss", "B-Fab", "Bianca Belair", "Blair Davenport",
            "Candice LeRae", "Carmella", "Charlotte Flair", "Chelsea Green",
            "Elektra Lopez", "Indi Hartwell", "Jade Cargill", "Michin",
            "Naomi", "Nia Jax", "Scarlett", "Sonya Deville", "Tegan Nox",
            "Tiffany Stratton",
        ],
    },
    "NXT": {
        "Men": [
            "Andre Chase", "Axiom", "Baron Corbin", "Brooks Jensen",
            "Channing Stacks Lorenzo", "Charlie Dempsey", "Dexter Lumis",
            "Duke Hudson", "Eddy Thorpe", "Ethan Page", "Je'Von Evans",
            "Joe Coffey", "Joe Gacy", "Johnny Gargano",
            "Josh Briggs", "Lexis King",
            "Mark Coffey", "Nathan Frazer", "Noam Dar", "Oba Femi",
            "Oro Mensah", "Ridge Holland", "Shawn Spears", "Tony D'Angelo",
            "Trick Williams", "Wes Lee", "Wolfgang",
        ],
        "Women": [
            "Cora Jade", "Fallon Henley", "Gigi Dolin", "Jacy Jayne",
            "Jaida Parker", "Jakara Jackson", "Kelani Jordan",
            "Lash Legend", "Lola Vice", "Nikkita Lyons", "Roxanne Perez",
            "Shotzi", "Sol Ruca", "Tatum Paxley", "Thea Hail",
            "Wendy Choo",
        ],
    },
    "Legends/Managers": {
        "Men": [
            "Andre The Giant", "Batista", "Bobby Lashley",
            "Booker T", "Bray Wyatt", "Bret Hart", "British Bulldog",
            "Brock Lesnar", "Bruno Sammartino", "Bubba Ray Dudley",
            "Cactus Jack", "D-Von Dudley", "Diesel", "Doink The Clown",
            "Dude Love", "Dusty Rhodes", "Eddie Guerrero",
            "Eric Bischoff", "Faarooq", "George Steele",
            "Harley Race", "Hollywood Hogan", "Honky Tonk Man",
            "Hulk Hogan", "Jake Roberts", "JBL",
            "Jerry Lawler", "Jim Neidhart", "Jinder Mahal",
            "Kane", "Ken Shamrock", "Kevin Nash",
            "Kurt Angle", "Macho Man Randy Savage",
            "Mankind", "Mr. Perfect", "Muhammad Ali",
            "MVP", "Omos", "Pat McAfee", "Razor Ramon",
            "Rick Rude", "Rick Steiner", "Ricky Steamboat",
            "Rikishi", "Rob Van Dam", "Roddy Piper",
            "Ronda Rousey", "Scott Hall", "Scott Steiner",
            "Shane McMahon", "Shawn Michaels", "Stardust",
            "Stephanie McMahon", "Stone Cold Steve Austin",
            "Syxx", "Ted DiBiase", "Terry Funk",
            "The Great Muta", "The Hurricane", "The Rock",
            "The Sandman", "Triple H", "Tyler Breeze",
            "Ultimate Warrior", "Umaga", "Undertaker",
            "Vader", "Veer Mahan", "Wade Barrett",
            "William Regal", "X-Pac", "Yokozuna",
            "Abyss", "Aleister Black", "Afa",
            "Wild Samoan Afa", "Wild Samoan Sika",
            "Billy Gunn", "Mosh", "Thrasher",
            "Headshrinker Fatu", "Headshrinker Samu",
            "Akam", "Rezar", "Paul Heyman",
            "Adam Pearce", "Ava", "Iron Sheik",
            "Armando Estrada", "Bobby The Brain Heenan",
            "Captain Lou Albano", "Brother Love",
            "Cathy Kelley", "Ava Moreno",
        ],
        "Women": [
            "Alundra Blayze", "Beth Phoenix", "Bull Nakano",
            "Chyna", "Eve Torres", "Lita",
            "Maryse", "Mighty Molly", "Molly Holly",
            "Michelle McCool", "Sensational Sherri",
            "Stacy Keibler", "Tamina", "Trish Stratus",
        ],
    },
}

# ── 2K25 Tag Teams & Stables ──
TEAMS_FACTIONS = [
    # Tag teams (2 members)
    ("A-Town Down Under", ["Austin Theory", "Grayson Waller"], "tag_team"),
    ("American Made", ["Chad Gable", "Julius Creed", "Brutus Creed"], "stable"),
    ("Alpha Academy", ["Chad Gable", "Otis", "Maxxine Dupri", "Akira Tozawa"], "stable"),
    ("Awesome Truth", ["Miz", "R-Truth"], "tag_team"),
    ("Authors of Pain", ["Akam", "Rezar"], "tag_team"),
    ("B-Fab/Michin", ["B-Fab", "Michin"], "tag_team"),
    ("Bloodline", ["Roman Reigns", "Jimmy Uso", "Solo Sikoa", "Jacob Fatu", "Tama Tonga", "Tonga Loa", "Paul Heyman"], "stable"),
    ("Brooks/Jensen/Fallon", ["Brooks Jensen", "Josh Briggs", "Fallon Henley"], "stable"),
    ("Brawling Brutes", ["Sheamus", "Pete Dunne", "Ridge Holland"], "stable"),
    ("Cedric/Ashante", ["Cedric Alexander", "Ashante Thee Adonis"], "tag_team"),
    ("Chase U", ["Andre Chase", "Duke Hudson", "Thea Hail"], "stable"),
    ("Creeds", ["Julius Creed", "Brutus Creed"], "tag_team"),
    ("DIY", ["Tommaso Ciampa", "Johnny Gargano"], "tag_team"),
    ("Dudley Boyz", ["Bubba Ray Dudley", "D-Von Dudley"], "tag_team"),
    ("Fraxiom", ["Nathan Frazer", "Axiom"], "tag_team"),
    ("Gallows/Anderson", ["Karl Anderson", "Luke Gallows"], "tag_team"),
    ("Imperium", ["Gunther", "Ludwig Kaiser", "Giovanni Vinci"], "stable"),
    ("Judgment Day", ["Finn Balor", "Damian Priest", "Dominik Mysterio", "JD McDonagh", "Carlito"], "stable"),
    ("KO/Sami", ["Kevin Owens", "Sami Zayn"], "tag_team"),
    ("Legado Del Phantasma", ["Santos Escobar", "Angel Garza", "Humberto Carrillo", "Elektra Lopez"], "stable"),
    ("LWO", ["Rey Mysterio", "Cruz Del Toro", "Joaquin Wilde", "Dragon Lee"], "stable"),
    ("Motor City Machine Guns", ["Alex Shelley", "Chris Sabin"], "tag_team"),
    ("New Day", ["Kofi Kingston", "Xavier Woods", "Big E"], "stable"),
    ("New Catch Republic", ["Tyler Bate", "Pete Dunne"], "tag_team"),
    ("NWO", ["Hollywood Hogan", "Scott Hall", "Kevin Nash", "Syxx"], "stable"),
    ("Piper Niven/Chelsea Green", ["Piper Niven", "Chelsea Green"], "tag_team"),
    ("Pretty Deadly", ["Elton Prince", "Kit Wilson"], "tag_team"),
    ("Regal/Bate", ["William Regal", "Tyler Bate"], "tag_team"),
    ("Street Profits", ["Angelo Dawkins", "Montez Ford"], "tag_team"),
    ("Team Angle", ["Drew Gulak", "Damon Kemp"], "tag_team"),
    ("The Pride", ["Bobby Lashley", "Montez Ford", "Angelo Dawkins"], "stable"),
    ("Tonga Loa/Tama Tonga", ["Tama Tonga", "Tonga Loa"], "tag_team"),
    ("Usos", ["Jey Uso", "Jimmy Uso"], "tag_team"),
    ("Viking Raiders", ["Erik", "Ivar", "Valhalla"], "stable"),
    ("Way", ["Candice LeRae", "Indi Hartwell", "Johnny Gargano"], "stable"),
    ("Wyatt Sicks", ["Uncle Howdy", "Dexter Lumis", "Joe Gacy", "Erik", "Nikki Cross"], "stable"),
]

# ── 2K25 Championships ──
TITLES = [
    ("Undisputed WWE Championship", "SmackDown", "world", "Cody Rhodes"),
    ("World Heavyweight Championship", "RAW", "world", "Gunther"),
    ("NXT Championship", "NXT", "world", "Trick Williams"),
    ("Intercontinental Championship", "RAW", "midcard", "Bron Breakker"),
    ("United States Championship", "SmackDown", "midcard", "LA Knight"),
    ("NXT North American Championship", "NXT", "midcard", "Oba Femi"),
    ("World Tag Team Championship", "RAW", "tag", None),
    ("WWE Tag Team Championship", "SmackDown", "tag", None),
    ("NXT Tag Team Championship", "NXT", "tag", None),
    ("Women's World Championship", "RAW", "womens_world", "Rhea Ripley"),
    ("WWE Women's Championship", "SmackDown", "womens_world", "Bayley"),
    ("NXT Women's Championship", "NXT", "womens_world", "Roxanne Perez"),
    ("Women's Intercontinental Championship", "RAW", "womens_midcard", "Lyra Valkyria"),
    ("WWE Women's United States Championship", "SmackDown", "womens_midcard", "Chelsea Green"),
    ("NXT Women's North American Championship", "NXT", "womens_midcard", "Kelani Jordan"),
    ("WWE Women's Tag Team Championship", None, "womens_tag", None),
    ("NXT Heritage Cup", "NXT", "gimmick", "Charlie Dempsey"),
    ("WWE Speed Championship", None, "gimmick", None),
    ("Women's WWE Speed Championship", None, "gimmick", None),
]

# ── 2K24 missing teams to backfill ──
MISSING_2K24_TEAMS = [
    ("Alpha Academy", ["Chad Gable", "Otis", "Maxxine Dupri", "Akira Tozawa"], "stable"),
    ("Cedric/Ashante", ["Cedric Alexander", "Ashante Thee Adonis"], "tag_team"),
    ("DIY", ["Tommaso Ciampa", "Johnny Gargano"], "tag_team"),
    ("Imperium", ["Gunther", "Ludwig Kaiser", "Giovanni Vinci"], "stable"),
    ("Team Angle", ["Drew Gulak", "Damon Kemp"], "tag_team"),
    ("MVP/Omos", ["MVP", "Omos"], "tag_team"),
    ("Piper Niven/Chelsea Green", ["Piper Niven", "Chelsea Green"], "tag_team"),
    ("Regal/Bate", ["William Regal", "Tyler Bate"], "tag_team"),
]

# Wrestlers needed for 2K24 backfill that are not yet in the 2K24 database
MISSING_2K24_WRESTLERS = [
    ("Chad Gable", "male", "face", 80),
    ("Otis", "male", "face", 78),
    ("Maxxine Dupri", "female", "face", 70),
    ("Akira Tozawa", "male", "face", 72),
    ("Cedric Alexander", "male", "face", 76),
    ("Ashante Thee Adonis", "male", "face", 74),
    ("Tommaso Ciampa", "male", "heel", 82),
    ("Johnny Gargano", "male", "face", 80),
    ("Gunther", "male", "heel", 94),
    ("Ludwig Kaiser", "male", "heel", 78),
    ("Giovanni Vinci", "male", "heel", 76),
    ("Drew Gulak", "male", "heel", 74),
    ("Damon Kemp", "male", "face", 72),
    ("MVP", "male", "heel", 78),
    ("Omos", "male", "heel", 76),
    ("Piper Niven", "female", "heel", 78),
    ("Chelsea Green", "female", "heel", 76),
    ("William Regal", "male", "face", 78),
    ("Tyler Bate", "male", "face", 80),
]

BRAND_COLORS = {
    "RAW": "#e02424",
    "SmackDown": "#005baa",
    "NXT": "#ffd700",
}


def api(method, path, data=None):
    """Thin HTTP client."""
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        msg = e.read().decode()[:200]
        print(f"  ⛔ {method} {path} → {e.code}: {msg}")
        return None
    except Exception as e:
        print(f"  ⛔ {method} {path} → {e}")
        return None


def parse_xlsm_roster():
    """Parse the WWE 2K25 XLSM Arkusz2 sheet for planning data."""
    data = []
    try:
        wb = openpyxl.load_workbook(
            "/root/.hermes/cache/documents/doc_1390cf70828e_WWE_2K25_UV_Mode_Tracker_v1.1.xlsm",
            data_only=False,
        )
        ws = wb["Arkusz2"]
        for row in ws.iter_rows(min_row=5, values_only=True):
            name = str(row[0]).strip() if row[0] else ""
            if name and len(name) > 1 and name != "Wrestler" and name != "None":
                data.append(name)
    except Exception as e:
        print(f"  Note: Could not parse XLSM Arkusz2: {e}")
    return data


def seed():
    print("╔════════════════════════════════════════════════════════╗")
    print("║  WWE 2K25 Roster Seed + 2K24 Backfill                ║")
    print("╚════════════════════════════════════════════════════════╝")

    # Parse XLSM planning data for documentation purposes
    plan_wrestlers = parse_xlsm_roster()
    if plan_wrestlers:
        print(f"\n  XLSM planning data found: {len(plan_wrestlers)} wrestlers referenced")
        for pw in plan_wrestlers[:20]:
            print(f"    • {pw}")
        if len(plan_wrestlers) > 20:
            print(f"    ... and {len(plan_wrestlers) - 20} more")

    # ── 1. Create Game ──
    print("\n── Game ──")
    game = api("POST", "/games", {
        "name": "WWE 2K25",
        "platform": "Multi (PS5/Xbox/PC)",
        "year": 2025,
        "description": "Full WWE 2K25 roster — RAW, SmackDown, NXT, and Legends"
    })
    if not game:
        # Check if already exists
        games = api("GET", "/games")
        for g in games:
            if g["name"] == "WWE 2K25":
                game = g
                print(f"  Found existing: {game['name']}")
                break
    if not game:
        print("  ERROR: Could not create or find WWE 2K25 game")
        sys.exit(1)

    GAME_ID = game["id"]
    print(f"  Game ID {GAME_ID}: {game['name']} ({game.get('year')})")

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

    # Also create a "Free Agent" brand for legends
    fa_brand = api("POST", "/brands", {
        "name": "Free Agent",
        "game_id": GAME_ID,
        "color": "#888888",
        "show_status": "inactive",
        "sort_order": 4,
    })
    if fa_brand:
        brand_ids["Free Agent"] = fa_brand["id"]
        print(f"  Free Agent → ID {fa_brand['id']}")

    # ── 3. Create Wrestlers ──
    print("\n── Wrestlers ──")
    wrestler_ids = {}
    count = 0

    # Power ratings
    power_map = {
        "Roman Reigns": 98, "Cody Rhodes": 96, "Seth Rollins": 93,
        "Bianca Belair": 95, "Rhea Ripley": 93, "Becky Lynch": 92,
        "Charlotte Flair": 93, "Gunther": 94, "The Rock": 96,
        "Undertaker": 95, "Stone Cold Steve Austin": 94, "John Cena": 93,
        "Brock Lesnar": 96, "Randy Orton": 91, "Triple H": 92,
        "Drew McIntyre": 91, "Damian Priest": 88, "Finn Balor": 87,
        "Kevin Owens": 88, "Sami Zayn": 86, "Jey Uso": 86,
        "LA Knight": 88, "Logan Paul": 84, "CM Punk": 92,
        "Bron Breakker": 87, "Ilja Dragunov": 86,
        "Penta": 85, "Jacob Fatu": 87, "Bobby Lashley": 89,
        "AJ Styles": 90, "Rey Mysterio": 85, "Bayley": 88,
        "IYO Sky": 87, "Tiffany Stratton": 84, "Nia Jax": 85,
        "Jade Cargill": 86, "Naomi": 82,
        "Trick Williams": 82, "Oba Femi": 81, "Ethan Page": 80,
        "Shawn Michaels": 93, "Bret Hart": 92,
        "Booker T": 86, "Kurt Angle": 92,
        "Eddie Guerrero": 90, "Macho Man Randy Savage": 91,
    }

    for brand_name in ["RAW", "SmackDown", "NXT", "Legends/Managers"]:
        brand_id = brand_ids.get(brand_name if brand_name != "Legends/Managers" else "Free Agent")
        genders = ["Women", "Men"] if brand_name != "Legends/Managers" else ["Men", "Women"]

        for gender in genders:
            for name in ROSTER_DATA[brand_name].get(gender, []):
                gender_key = "female" if gender == "Women" else "male"
                alignment = KNOWN_ALIGNMENTS.get(name, "face")
                power = power_map.get(name, 82 if gender_key == "male" else 80)
                if name in FEMALES:
                    gender_key = "female"

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

    print(f"  Total: {count} wrestlers seeded for 2K25")

    # ── 4. Create Tag Teams & Stables (2K25) ──
    print("\n── Tag Teams & Stables (2K25) ──")

    def find_wrestler_id(name):
        key = name.lower().replace("'", "").replace(" ", "")
        for k, wid in wrestler_ids.items():
            if key in k or k in key:
                return wid
        return None

    for team_name, members, kind in TEAMS_FACTIONS:
        if len(members) < 2:
            continue

        member_ids = [find_wrestler_id(m) for m in members]
        member_ids = [m for m in member_ids if m is not None]

        if len(member_ids) < 2:
            print(f"  ⚠ Could not find enough members for '{team_name}' (found {len(member_ids)}/{len(members)})")
            continue

        if kind == "tag_team":
            t = api("POST", "/tag-teams", {
                "name": team_name,
                "game_id": GAME_ID,
                "member1_id": member_ids[0],
                "member2_id": member_ids[1],
                "alignment": "heel" if team_name in (
                    "Bloodline", "Judgment Day", "A-Town Down Under",
                    "Imperium", "NWO", "Pretty Deadly", "Gallows/Anderson",
                ) else "face",
                "status": "active",
            })
            if t:
                print(f"  ✓ Tag Team: {team_name}")
        elif kind == "stable":
            s = api("POST", "/stables", {
                "name": team_name,
                "game_id": GAME_ID,
                "status": "active",
                "member_ids": member_ids,
            })
            if s:
                print(f"  ✓ Stable: {team_name} ({len(member_ids)} members)")

    # ── 5. Create Championships (2K25) ──
    print("\n── Championships (2K25) ──")

    def wid(name):
        return find_wrestler_id(name)

    for title_name, brand_name, tier, holder in TITLES:
        b_id = brand_ids.get(brand_name) if brand_name else None
        holder_id = wid(holder) if holder else None
        c = api("POST", "/championships", {
            "name": title_name,
            "game_id": GAME_ID,
            "brand_id": b_id,
            "tier": tier,
            "holder1_id": holder_id,
            "is_vacant": holder is None,
        })
        if c:
            holder_str = holder or "Vacant"
            print(f"  {title_name} [{tier}] → {holder_str}")

    # ═══════════════════════════════════════════════════════════════╗
    # ║  Backfill missing WWE 2K24 teams/stables                    ║
    # ╚══════════════════════════════════════════════════════════════╝
    print("\n── 2K24 Backfill: Missing Tag Teams & Stables ──")

    # Get existing 2K24 game
    games = api("GET", "/games")
    game_24 = None
    for g in games:
        if g["name"] == "WWE 2K24":
            game_24 = g
            break

    if not game_24:
        print("  ⚠ WWE 2K24 game not found, skipping backfill")
    else:
        GAME24_ID = game_24["id"]
        print(f"  Backfilling into game ID {GAME24_ID}: WWE 2K24")

        # Direct SQLite query (GET /wrestlers endpoint is broken)
        DB_PATH = Path(__file__).resolve().parent.parent / "data" / "wrestling.db"
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id, name FROM wrestlers WHERE game_id = ?",
            (GAME24_ID,)
        )
        rows = cursor.fetchall()
        conn.close()

        print(f"  Found {len(rows)} 2K24 wrestlers via direct DB query")

        wrestler24_ids = {}
        for row in rows:
            name = row["name"]
            key = name.lower().replace("'", "").replace(" ", "").replace("é", "e")
            wrestler24_ids[key] = row["id"]

        # Get 2K24 brand IDs and existing teams from DB
        cursor2 = sqlite3.connect(str(DB_PATH))
        cursor2.row_factory = sqlite3.Row
        c = cursor2.cursor()
        c.execute("SELECT id, name FROM brands WHERE game_id = ?", (GAME24_ID,))
        brand_rows = c.fetchall()
        brand24_ids = {b["name"]: b["id"] for b in brand_rows}
        
        existing_24_teams = set()
        c.execute("SELECT id, name FROM tag_teams WHERE game_id = ?", (GAME24_ID,))
        for t in c.fetchall():
            existing_24_teams.add(t["name"].lower().strip())
        c.execute("SELECT id, name FROM stables WHERE game_id = ?", (GAME24_ID,))
        for s in c.fetchall():
            existing_24_teams.add(s["name"].lower().strip())
        cursor2.close()

        def find_24_id(name):
            key = name.lower().replace("'", "").replace(" ", "").replace("é", "e")
            for k, wid in wrestler24_ids.items():
                if key == k or key in k or k in key:
                    return wid
            return None

        # Create missing 2K24 wrestlers needed for backfill teams
        backfill_wrestler_count = 0
        for wname, wgender, walignment, wpower in MISSING_2K24_WRESTLERS:
            if find_24_id(wname):
                continue  # Already exists
            w = api("POST", "/wrestlers", {
                "name": wname,
                "game_id": GAME24_ID,
                "brand_id": brand24_ids.get("RAW"),
                "gender": wgender,
                "alignment": walignment,
                "status": "active",
                "power": wpower,
                "is_caw": False,
            })
            if w:
                key = wname.lower().replace("'", "").replace(" ", "")
                wrestler24_ids[key] = w["id"]
                backfill_wrestler_count += 1
        if backfill_wrestler_count:
            print(f"  Created {backfill_wrestler_count} missing 2K24 wrestlers for backfill")

        # Now seed missing teams
        backfilled_count = 0
        for team_name, members, kind in MISSING_2K24_TEAMS:
            if team_name.lower().strip() in existing_24_teams:
                print(f"  ⏭ Already exists: {team_name}")
                continue

            member_ids = [find_24_id(m) for m in members]
            member_ids = [m for m in member_ids if m is not None]

            if len(member_ids) < 2:
                print(f"  ⚠ Could not find enough 2K24 members for '{team_name}' ({len(member_ids)}/{len(members)})")
                continue

            if kind == "tag_team":
                t = api("POST", "/tag-teams", {
                    "name": team_name,
                    "game_id": GAME24_ID,
                    "brand_id": brand24_ids.get("RAW"),
                    "member1_id": member_ids[0],
                    "member2_id": member_ids[1],
                    "alignment": "heel" if team_name in ("Imperium",) else "face",
                    "status": "active",
                })
                if t:
                    backfilled_count += 1
                    print(f"  ✓ Backfilled Tag Team: {team_name}")
            elif kind == "stable":
                s = api("POST", "/stables", {
                    "name": team_name,
                    "game_id": GAME24_ID,
                    "brand_id": brand24_ids.get("RAW"),
                    "status": "active",
                    "member_ids": member_ids,
                })
                if s:
                    backfilled_count += 1
                    print(f"  ✓ Backfilled Stable: {team_name} ({len(member_ids)} members)")

        print(f"\n  Backfilled {backfilled_count} missing 2K24 teams/stables")

    print("\n╔════════════════════════════════════════════════════════╗")
    print("║  Seed complete!                                       ║")
    print(f"║  WWE 2K25: {count} wrestlers seeded                ║")
    print(f"║  WWE 2K25: {len(TEAMS_FACTIONS)} teams/factions     ║")
    print(f"║  WWE 2K25: {len(TITLES)} championships              ║")
    print("╚════════════════════════════════════════════════════════╝")
    print(f"\n→ API: http://127.0.0.1:8000/docs")


if __name__ == "__main__":
    seed()
