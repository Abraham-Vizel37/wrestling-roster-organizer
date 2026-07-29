"""
Parsed WWE Data — structured Python dicts extracted from:
  - WWE 2K24.xlsx  (Full Roster, Drafted Roster, Teams/Factions)
  - WWE 2K25_UV_Mode_Tracker_v1.1.xlsm  (Rosters, Championship sheets)

Usage:
    from parsed_wwe_data import WWE2K24, WWE2K25, get_all_wrestlers
"""

# ──────────────────────────────────────────────
# WWE 2K24 — Full Roster (complete wrestler list)
# ──────────────────────────────────────────────

WWE2K24_FULL_ROSTER = [
    "AJ Styles", "Akira Tozawa", "Alba Fyre", "Alexa Bliss", "Andre Chase",
    "Andre the Giant", "Angel Garza", "Angelo Dawkins", "Apollo Crews",
    "Ashante Thee Adonis", "Asuka", "Austin Theory", "Axiom", "Baron Corbin",
    "Batista", "Bayley", "Becky Lynch", "Beth Pheonix", "Bianca Belair",
    "Big Bossman", "Big E", "Blair Davenport", "Bobby Lashley", "Boogeyman",
    "Booker T", "Braun Strowman", "Bray Wyatt", "Bret Hart", "British Bulldog",
    "Bron Breakker", "Bronson Reed", "Brooks Jensen", "Brutus Creed", "Butch",
    "Cactus Jack", "Cameron Grimes", "Candice LeRae", "Carmella", "Carmelo Hayes",
    "Cedric Alexander", "Chad Gable", 'Channing "Stacks" Lorenzo', "Charlotte",
    "Chelsea Green", "Chyna", "Cody Rhodes", "Cora Jade", "Cruz Del Toro",
    "Dakota Kai", "Damien Priest", "Damon Kemp", "Dexter Lumis", "Dijak",
    "Doink The Clown", "Dominik Mysterio", "Drew Gulak", "Drew McIntyre",
    "Dude Love", "Duke Hudson", "Dusty Rhodes", "Eddie Guerrero", "Elton Prince",
    "Erik", "Eve Torres", "Faarooq", "Fallon Henley", "Finn Balor",
    "George Steele", "Gigi Dolin", "Giovanni Vinci", "Grayson Waller", "Gunther",
    "Harley Race", "Hollywood Hogan", "Humberto Carrillo", "Ilja Dragunov",
    "Indi Hartwell", "Isla Dawn", "Ivar", "Ivy Nile", "IYO Sky", "Jacy Jayne",
    "Jake Roberts", "JBL", "JD McDonaugh", "Jerry Lawler", "Jey Uso",
    "Jim Neidhart", "Jimmy Uso", "Jinder Mahal", "Joaquin Wilde", "Joe Coffey",
    "Joe Gacy", "John Cena", "Johnny Gargano", "Josh Briggs", "Julius Creed",
    "Kane", "Karl Anderson", "Karrion Kross", "Katana Chance", "Kayden Carter",
    "Ken Shamrock", "Kevin Nash", "Kevin Owens", "Kit Wilson", "Kofi Kingston",
    "Kurt Angle", "LA Knight", "Lita", "Liv Morgan", "Logan Paul",
    "Ludwig Kaiser", "Luke Gallows", "Macho Man", "Mankind", "Mark Coffey",
    "Maryse", "Maxxine Dupri", "Michin", "Miz", "Molly Holly", "Montez Ford",
    "Muhammed Ali", "MVP", "Natalya", "Nathan Frazer", "Nikki Cross",
    "Nikkita Lyons", "Noam Dar", "Omos", "Otis", "Piper Niven", "R-Truth",
    "Randy Orton", "Raquel Rodriguez", "Ravishing Rick Rude", "Rey Mysterio",
    "Rhea Ripley", "Ricochet", "Rick Steiner", "Ricky Steamboat", "Ridge Holland",
    "Rikishi", "Rob Van Dam", "Robert Roode", "Roman Reigns", "Ronda Rousey",
    "Rowdy Roddy Piper", "Roxanne Perez", "Sami Zayn", "Sanga", "Santos Escobar",
    "Scarlett", "Scott Hall", "Scott Steiner", "Scrypts", "Seth Rollins",
    "Shane McMahon", "Shawn Michaels", "Shayna Baszler", "Sheamus",
    "Shinsuke Nakamura", "Shotzi", "Solo Sikoa", "Sonya Deville", "Stacy Keibler",
    "Stardust", "Stone Cold", "Superstar Billy Graham", "Syxx", "Tamina",
    "Ted Dibiase", "Tegan Nox", "The Hurricane", "The Miz", "The Rock",
    "Thea Hail", "Tiffany Stratton", "Tomasso Ciampa", "Tony D'Angelo",
    "Trick Williams", "Trish Stratus", "Triple-H", "Tyler Bate", "Tyler Breeze",
    "Umaga", "Uncle Howdy", "Undertaker", "Vader", "Valhalla", "Veer Mahan",
    "Wade Barrett", "Wendy Choo", "Wes Lee", "William Regal", "Wolfgang",
    "Xavier Woods", "Xia Li", "Yokozuna", "Zelina Vega", "Zoey Stark",
]

# ──────────────────────────────────────────────
# WWE 2K24 — Drafted Roster (brand + gender)
# ──────────────────────────────────────────────

WWE2K24_DRAFTED_ROSTER = {
    "RAW": {
        "Men": [
            "AJ Styles", "Angelo Dawkins", "Big E", "Bobby Lashley",
            "Cameron Grimes", "Cruz Del Toro", "Joaquin Wilde", "Karl Anderson",
            "Kofi Kingston", "LA Knight", "Luke Gallows", "Macho Man Randy",
            "Mankind", "Miz", "Montez Ford", "Nathan Frazer", "R-Truth",
            "Randy Orton", "Rey Mysterio", "Ricochet", "Seth Rollins",
            "Stone Cold", "Tyler Breeze", "Undertaker", "Wes Lee", "Xavier Woods",
            "Austin Theory", "Baron Corbin", "Batista", "Big Bossman",
            "Bron Breakker", "Carmello Hayes", "Channing Stacks Lorenzo", "Dijak",
            "Grayson Waller", "Hollywood Hogan", "Jake Roberts", "Joe Coffey",
            "Kevin Nash", "Logan Paul", "Mark Coffey", "Noam Dar", "Rikishi",
            "Scott Hall", "Shinsuke Nakamura", "Superstar Billy Graham", "Syxx",
            "Tony D'Angelo", "Trick Williams", "Wade Barrett", "Wolfgang",
            "Yokozuna",
        ],
        "Women": [
            "Becky Lynch", "Candice LeRae", "Gigi Dolin", "Indi Hartwell", "Lita",
            "Michin", "Roxxane Perez", "Shotzi", "Tegan Nox", "Zelina Vega",
        ],
    },
    "SmackDown": {
        "Men": [
            "Andre Chase", "Apollo Crews", "Booker T", "Bray Wyatt",
            "Brooks Jensen", "Butch", "Cactus Jack", "Cody Rhodes",
            "Duke Hudson", "Dusty Rhodes", "Eddie Guerrero", "Ilja Dragunov",
            "Jey Uso", "Josh Briggs", "Kevin Owens", "Muhammed Ali",
            "Ricky Steamboat", "Ridge Holland", "RVD", "Sami Zayn",
            "Shawn Michaels", "Sheamus", "Triple-H", "Uncle Howdy",
            "Andre the Giant", "Angel Garza", "Bronson Reed", "Damien Priest",
            "Dominick Mysterio", "Elton Prince", "Erik", "Finn Balor",
            "Harley Race", "Humberto Carrillo", "Ivar", "JD McDonaugh",
            "Jerry Lawler", "Jimmy Uso", "Kane", "Karrion Kross", "Kit Wilson",
            "Rick Rude", "Rick Steiner", "Robert Roode", "Roman Reigns",
            "Santos Escobar", "Scott Steiner", "Shane McMahon", "Solo Sikoa",
            "The Rock",
        ],
        "Women": [
            "Alba Fyre", "Asuka", "Bayley", "Bianca Belair", "Dakota Kai",
            "Isla Dawn", "IYO Sky", "Kayden Carter", "Liv Morgan", "Nikki Cross",
            "Nikkita Lyons", "Racquel Rodriguez", "Rhea Ripley", "Scarlett",
            "Trish Stratus", "Valhalla", "Thea Hail", "Zoey Stark",
            "Beth Phoenix", "Carmella", "Charlotte", "Chelsea Green",
            "Fallon Henley", "Jacy Jayne", "Katana Chance", "Molly Holly",
            "Piper Niven",
        ],
    },
    "NXT": {
        "Men": [
            "Akira Tozawa", "Ashante Thee Adonis", "Axiom", "Boogeyman",
            "Braun Strowman", "Brutus Creed", "Cedric Alexander", "Chad Gable",
            "Ciampa", "Dexter Lumis", "Drew Gulak", "Drew McIntyre",
            "Dude Love", "Faarooq", "Gargano", "George Steele", "Gunther",
            "Hurricane", "JBL", "Jim Neidhart", "Jinder Mahal", "Joe Gacy",
            "John Cena", "Julius Creed", "Ken Shamrock", "Kurt Angle",
            "Ludwig Kaiser", "MVP", "Omos", "Otis", "Sanga", "Scrypts",
            "Stardust", "Ted Dibiase", "Tyler Bate", "Umaga", "Vader",
            "Veer Mahan", "William Regal",
        ],
        "Women": [
            "Alexa Bliss", "Bret Hart", "British Bulldog", "Cora Jade",
            "Damon Kemp", "Doink the Clown", "Eve Torres", "Giovanni Vinci",
            "Maxxine Dupri", "Maryse", "Natalya", "Ronda Rousey", "Shayna Baszler",
            "Stacy Keibler", "Tamina", "Tiffany Stratton", "Wendy Choo",
            "Xia Li",
        ],
    },
}

# ──────────────────────────────────────────────
# WWE 2K24 — Teams / Factions (from Full Roster)
# ──────────────────────────────────────────────

WWE2K24_TEAMS_FACTIONS = {
    # --- RAW Teams (from Full Roster left column) ---
    "A-Town Down Under":         {"members": ["Austin Theory", "Grayson Waller"],        "type": "tag_team"},
    "Awesome Truth":             {"members": ["Miz", "R-Truth"],                         "type": "tag_team"},
    "D'Angelo Family":           {"members": ["Tony D'Angelo", "Channing \"Stacks\" Lorenzo"], "type": "tag_team"},
    "DMG Control":               {"members": ["Asuka", "IYO Sky", "Dakota Kai", "Bayley"], "type": "stable"},
    "Gallus":                    {"members": ["Joe Coffey", "Mark Coffey", "Wolfgang"],    "type": "stable"},
    "LWO":                       {"members": ["Rey Mysterio", "Cruz Del Toro", "Joaquin Wilde", "Zelina Vega"], "type": "stable"},
    "New Day":                   {"members": ["Big E", "Kofi Kingston", "Xavier Woods"],  "type": "stable"},
    "NWO":                       {"members": ["Hollywood Hogan", "Scott Hall", "Kevin Nash", "Syxx"], "type": "stable"},
    "Rikishi/Yokozuna":          {"members": ["Rikishi", "Yokozuna"],                    "type": "tag_team"},
    "Roxxanne/Lita":             {"members": ["Roxxane Perez", "Lita"],                   "type": "tag_team"},
    "Tegan/Shotzi":              {"members": ["Tegan Nox", "Shotzi"],                     "type": "tag_team"},
    "The OC":                    {"members": ["AJ Styles", "Luke Gallows", "Karl Anderson", "Michin"], "type": "stable"},
    "The Pride":                 {"members": ["Bobby Lashley", "Montez Ford", "Angelo Dawkins"], "type": "stable"},
    "The Way":                   {"members": ["Candice LeRae", "Indi Hartwell"],           "type": "tag_team"},
    "Trick Melo Gang":           {"members": ["Trick Williams", "Carmello Hayes"],         "type": "tag_team"},
    "Unholy Union":              {"members": ["Alba Fyre", "Isla Dawn"],                  "type": "tag_team"},
    "Wolf Dogs":                 {"members": ["Baron Corbin", "Bron Breakker"],            "type": "tag_team"},
    "Diamond Mine":              {"members": ["Brutus Creed", "Julius Creed", "Ivy Nile"], "type": "stable"},
    "DIY":                       {"members": ["Tomasso Ciampa", "Johnny Gargano", "Dexter Lumis"], "type": "stable"},
    "DX":                        {"members": ["Shawn Michaels", "Triple-H"],               "type": "tag_team"},
    "Hart Foundation":           {"members": ["Bret Hart", "Jim Neidhart", "British Bulldog", "Natalya"], "type": "stable"},
    "Imperium":                  {"members": ["Gunther", "Giovanni Vinci", "Ludwig Kaiser"], "type": "stable"},
    "Indus Sher":                {"members": ["Jinder Mahal", "Veer Mahan", "Sanga"],       "type": "stable"},
    "Judgement Day":             {"members": ["Rhea Ripley", "Dominik Mysterio", "Damien Priest", "Finn Balor", "JD McDonaugh"], "type": "stable"},
    "Karrion/Scarlett":          {"members": ["Karrion Kross", "Scarlett"],                 "type": "tag_team"},
    "Kayden/Katana":             {"members": ["Kayden Carter", "Katana Chance"],            "type": "tag_team"},
    "KO/Sami":                   {"members": ["Kevin Owens", "Sami Zayn"],                  "type": "tag_team"},
    "Legado Del Phantasma":      {"members": ["Santos Escobar", "Angel Garza", "Humberto Carrillo"], "type": "stable"},
    "Liv/Racquel":               {"members": ["Liv Morgan", "Raquel Rodriguez"],            "type": "tag_team"},
    "Nightmare Family":          {"members": ["Cody Rhodes", "Dusty Rhodes"],               "type": "tag_team"},
    "Piper Niven/Chelsea Green": {"members": ["Piper Niven", "Chelsea Green"],              "type": "tag_team"},
    "Pretty Deadly":             {"members": ["Elton Prince", "Kit Wilson"],                "type": "tag_team"},
    "Steiners":                  {"members": ["Rick Steiner", "Scott Steiner"],             "type": "tag_team"},
    "Trish/Zoey Stark":          {"members": ["Trish Stratus", "Zoey Stark"],               "type": "tag_team"},
    "Viking Raiders":            {"members": ["Ivar", "Erik", "Valhalla"],                  "type": "stable"},
    "Wyatt/Howdy":               {"members": ["Bray Wyatt", "Uncle Howdy"],                 "type": "tag_team"},
    # --- NXT Teams ---
    "Alpha Academy":             {"members": ["Chad Gable", "Otis", "Maxxine Dupri", "Akira Tozawa"], "type": "stable"},
    "Bloodline":                 {"members": ["Roman Reigns", "Jimmy Uso", "Solo Sikoa", "The Rock"], "type": "stable"},
    "Brawling Brutes":           {"members": ["Sheamus", "Butch", "Ridge Holland"],          "type": "stable"},
    "Brooks/Jensen/Fallon":      {"members": ["Brooks Jensen", "Josh Briggs", "Fallon Henley"], "type": "stable"},
    "Team Angle":                {"members": ["Drew Gulak", "Damon Kemp"],                   "type": "tag_team"},
    "Cedric/Ashante":            {"members": ["Cedric Alexander", "Ashante Thee Adonis"],    "type": "tag_team"},
    "Chase U":                   {"members": ["Andre Chase", "Duke Hudson", "Thea Hail"],    "type": "stable"},
    "Harley Race/Jerry Lawler":  {"members": ["Harley Race", "Jerry Lawler"],                "type": "tag_team"},
    "MVP/Omos":                  {"members": ["MVP", "Omos"],                                "type": "tag_team"},
    "Regal/Bate":                {"members": ["William Regal", "Tyler Bate"],                "type": "tag_team"},
    "Ted Dibiase/JBL":           {"members": ["Ted Dibiase", "JBL"],                         "type": "tag_team"},
}

# ──────────────────────────────────────────────
# WWE 2K24 — Championships (from seed script)
# ──────────────────────────────────────────────

WWE2K24_CHAMPIONSHIPS = [
    {"name": "WWE Championship",               "brand": "SmackDown", "tier": "world",           "holder": "Roman Reigns"},
    {"name": "World Heavyweight Championship",  "brand": "RAW",       "tier": "world",           "holder": "Seth Rollins"},
    {"name": "NXT Championship",                "brand": "NXT",       "tier": "world",           "holder": None},
    {"name": "Intercontinental Championship",   "brand": "SmackDown", "tier": "midcard",         "holder": "Gunther"},
    {"name": "United States Championship",      "brand": "RAW",       "tier": "midcard",         "holder": None},
    {"name": "NXT North American Championship", "brand": "NXT",       "tier": "midcard",         "holder": None},
    {"name": "Undisputed WWE Tag Team Championship", "brand": "SmackDown", "tier": "tag",    "holder": None},
    {"name": "World Tag Team Championship",     "brand": "RAW",       "tier": "tag",            "holder": None},
    {"name": "NXT Tag Team Championship",       "brand": "NXT",       "tier": "tag",            "holder": None},
    {"name": "WWE Women's Championship",        "brand": "SmackDown", "tier": "womens_world",   "holder": "Bayley"},
    {"name": "Women's World Championship",      "brand": "RAW",       "tier": "womens_world",    "holder": "Rhea Ripley"},
    {"name": "NXT Women's Championship",        "brand": "NXT",       "tier": "womens_world",    "holder": None},
    {"name": "WWE Women's Intercontinental Championship", "brand": "SmackDown", "tier": "womens_midcard", "holder": None},
    {"name": "WWE Women's United States Championship",   "brand": "RAW",       "tier": "womens_midcard", "holder": None},
    {"name": "NXT Women's North American Championship",  "brand": "NXT",       "tier": "womens_midcard", "holder": None},
    {"name": "WWE Women's Tag Team Championship",        "brand": None,       "tier": "womens_tag",      "holder": None},
]

# ──────────────────────────────────────────────
# WWE 2K25 — Brand GMs & Show Status
# ──────────────────────────────────────────────

WWE2K25_BRANDS = {
    "RAW": {
        "gm": "Adam Pearce",
        "show_status": "A Show",
        "roster_size": 40,
        "main_eventers": 8,
        "championships_count": 6,
        "face_count": 22,
        "heel_count": 18,
    },
    "SmackDown": {
        "gm": "Nick Aldis",
        "show_status": "B+ Show",
        "roster_size": 40,
        "main_eventers": 8,
        "championships_count": 6,
        "face_count": 22,
        "heel_count": 18,
    },
    "NXT": {
        "gm": "Ava",
        "show_status": "C Show",
        "roster_size": 40,
        "main_eventers": 8,
        "championships_count": 6,
        "face_count": 22,
        "heel_count": 18,
    },
}

# ──────────────────────────────────────────────
# WWE 2K25 — Championship sheets (structured)
# ──────────────────────────────────────────────

WWE2K25_CHAMPIONSHIPS = {
    # Brand 1 = RAW
    "1_World_Title": {
        "title": "World Heavyweight Title",
        "brand": "RAW",
        "tier": "MAIN EVENT",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
    "1_Midcard_Title": {
        "title": "Intercontinental Title",
        "brand": "RAW",
        "tier": "MID-CARD",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
    "1_Tag_Title": {
        "title": "Tag Team Titles",
        "brand": "RAW",
        "tier": "TAG TEAM",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
    "1_Womens_World_Title": {
        "title": "Women's World Heavyweight Title",
        "brand": "RAW",
        "tier": "MAIN EVENT",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
    "1_Womens_Midcard_Title": {
        "title": "Women's Intercontinental Title",
        "brand": "RAW",
        "tier": "MID-CARD",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
    "1_Womens_Tag_Title": {
        "title": "Women's Tag Team Titles",
        "brand": "RAW & SMACKDOWN",
        "tier": "TAG TEAM",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
    # Brand 2 = SmackDown
    "2_World_Title": {
        "title": "WWE Title",
        "brand": "SmackDown",
        "tier": "MAIN EVENT",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
    "2_Midcard_Title": {
        "title": "United States Title",
        "brand": "SmackDown",
        "tier": "MID-CARD",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
    "2_Tag_Title": {
        "title": "Tag Team Titles",
        "brand": "SmackDown",
        "tier": "TAG TEAM",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
    "2_Womens_World_Title": {
        "title": "WWE Women's Title",
        "brand": "SmackDown",
        "tier": "MAIN EVENT",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
    "2_Womens_Midcard_Title": {
        "title": "Women's United States Title",
        "brand": "SmackDown",
        "tier": "MID-CARD",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
    "2_Womens_Tag_Title": {
        "title": "Women's Tag Team Titles",
        "brand": "SmackDown",
        "tier": "TAG TEAM",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
    # Brand 3 = NXT
    "3_World_Title": {
        "title": "NXT World Title",
        "brand": "NXT",
        "tier": "MAIN EVENT",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
    "3_Midcard_Title": {
        "title": "NXT North American Title",
        "brand": "NXT",
        "tier": "MID-CARD",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
    "3_Tag_Title": {
        "title": "NXT Tag Team Titles",
        "brand": "NXT",
        "tier": "TAG TEAM",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
    "3_Womens_World_Title": {
        "title": "NXT Women's World Title",
        "brand": "NXT",
        "tier": "MAIN EVENT",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
    "3_Womens_Midcard_Title": {
        "title": "NXT Women's North American Title",
        "brand": "NXT",
        "tier": "MID-CARD",
        "champion_placeholder": "WRESTLER X",
        "days_placeholder": "X",
        "defences_placeholder": "X",
        "won_at_placeholder": "EVENT X",
        "allegiance_placeholder": "FACE",
    },
}

# ──────────────────────────────────────────────
# WWE 2K25 — Special / Gimmick / Tournament sheets
# ──────────────────────────────────────────────

WWE2K25_SPECIAL_TITLES = {
    "Gimmick_Title_1": {
        "title": "WWE Speed Title",
        "brand": "WWE",
        "tier": "GIMMICK",
    },
    "Gimmick_Title_2": {
        "title": "WWE Women's Speed Title",
        "brand": "WWE",
        "tier": "GIMMICK",
    },
    "3_Mens_Trophy": {
        "title": "WWE NXT Heritage Cup",
        "brand": "NXT",
        "tier": "MID-CARD",
    },
}

WWE2K25_TOURNAMENTS = {
    "Tag_Tournament": {
        "title": "Dusty Rhodes Tag Team Classic (Men)",
        "brand": "NXT",
        "tier": "TAG TEAM",
    },
    "Tournament": {
        "title": "King of the Ring",
        "brand": "WWE",
        "tier": "MAIN EVENT",
    },
    "Rumble": {
        "title": "Royal Rumble Match (Men)",
        "brand": "WWE",
        "tier": "MAIN EVENT",
    },
    "MITB": {
        "title": "Money in the Bank (Men)",
        "brand": "WWE",
        "tier": "MAIN EVENT",
    },
}

# ──────────────────────────────────────────────
# WWE 2K25 — Monthly Schedule overview
# ──────────────────────────────────────────────

WWE2K25_MONTHLY_SCHEDULE = [
    {"month": "JANUARY",   "raw": "RAW #1-4",   "nxt": "NXT #1-4",   "sd": "SD #1-4",   "ppv": None,           "sat_ppv": None},
    {"month": "FEBRUARY",  "raw": "RAW #5-8",   "nxt": "NXT #5-8",   "sd": "SD #5-8",   "ppv": "FEBRUARY_PPV", "sat_ppv": "FEBRUARY_SAT_PPV"},
    {"month": "MARCH",     "raw": "RAW #9-12",  "nxt": "NXT #9-12",  "sd": "SD #9-12",  "ppv": "MARCH_PPV",    "sat_ppv": "MARCH_SAT_PPV"},
    {"month": "APRIL",     "raw": "RAW #13-16", "nxt": "NXT #13-16", "sd": "SD #13-16", "ppv": "APRIL_PPV",    "sat_ppv": None},
    {"month": "MAY",       "raw": "RAW #17-20", "nxt": "NXT #17-20", "sd": "SD #17-20", "ppv": "MAY_PPV",      "sat_ppv": None},
    {"month": "JUNE",      "raw": "RAW #21-24", "nxt": "NXT #21-24", "sd": "SD #21-24", "ppv": "JUNE_PPV",     "sat_ppv": "JUNE_SAT_PPV"},
    {"month": "JULY",      "raw": "RAW #25-28", "nxt": "NXT #25-28", "sd": "SD #25-28", "ppv": "JULY_PPV",     "sat_ppv": "JULY_SAT_PPV"},
    {"month": "AUGUST",    "raw": "RAW #29-32", "nxt": "NXT #29-32", "sd": "SD #29-32", "ppv": "AUGUST_PPV",   "sat_ppv": None},
    {"month": "SEPTEMBER", "raw": "RAW #33-36", "nxt": "NXT #33-36", "sd": "SD #33-36", "ppv": "SEPTEMBER_PPV","sat_ppv": "SEPTEMBER_SAT_PPV"},
    {"month": "OCTOBER",   "raw": "RAW #37-40", "nxt": "NXT #37-40", "sd": "SD #37-40", "ppv": "OCTOBER_PPV",  "sat_ppv": "OCTOBER_SAT_PPV"},
    {"month": "NOVEMBER",  "raw": "RAW #41-44", "nxt": "NXT #41-44", "sd": "SD #41-44", "ppv": "NOVEMBER_PPV", "sat_ppv": None},
    {"month": "DECEMBER",  "raw": "RAW #45-48", "nxt": "NXT #45-48", "sd": "SD #45-48", "ppv": "DECEMBER_PPV", "sat_ppv": "DECEMBER_SAT_PPV"},
]

# ──────────────────────────────────────────────
# WWE 2K25 — PPV Events mapped to brand
# ──────────────────────────────────────────────

WWE2K25_PPV_EVENTS = {
    "JANUARY_PPV":     {"event": None,            "brand": None},
    "FEBRUARY_PPV":    {"event": None,            "brand": "RAW+SD"},
    "FEBRUARY_SAT_PPV":{"event": None,            "brand": "NXT"},
    "MARCH_PPV":       {"event": None,            "brand": "RAW+SD"},
    "MARCH_SAT_PPV":   {"event": None,            "brand": "NXT"},
    "APRIL_PPV":       {"event": None,            "brand": "RAW+SD"},
    "MAY_PPV":         {"event": None,            "brand": "RAW+SD"},
    "JUNE_PPV":        {"event": None,            "brand": "RAW+SD"},
    "JUNE_SAT_PPV":    {"event": None,            "brand": "NXT"},
    "JULY_PPV":        {"event": "BASH IN BERLIN","brand": "RAW+SD"},
    "JULY_SAT_PPV":    {"event": None,            "brand": "NXT"},
    "AUGUST_PPV":      {"event": None,            "brand": "RAW+SD"},
    "SEPTEMBER_PPV":   {"event": "BASH IN BERLIN","brand": "RAW+SD"},
    "SEPTEMBER_SAT_PPV":{"event": "NXT NO MERCY", "brand": "NXT"},
    "OCTOBER_PPV":     {"event": "BAD BLOOD",     "brand": "RAW+SD"},
    "OCTOBER_SAT_PPV": {"event": "NXT HALLOWEEN HAVOC","brand": "NXT"},
    "NOVEMBER_PPV":    {"event": "SURVIVOR SERIES","brand": "RAW+SD"},
    "DECEMBER_PPV":    {"event": "SATURDAY NIGHT'S MAIN EVENT","brand": "RAW+SD"},
    "DECEMBER_SAT_PPV":{"event": "NXT DEADLINE",  "brand": "NXT"},
}

# ──────────────────────────────────────────────
# WWE 2K25 — Known Wrestlers (from Arkusz2 sheet)
# ──────────────────────────────────────────────

WWE2K25_KNOWN_WRESTLERS = [
    "Roman Reigns", "Seth Rollins", "CM Punk", "John Cena",
    "Kevin Owens", "Penta", "Sheamus", "Dominik Mysterio",
    "Finn Balor", "Fraxiom", "Dudley Boyz", "New Day",
]

# ──────────────────────────────────────────────
# Helper functions
# ──────────────────────────────────────────────

def get_all_wrestlers():
    """Return the merged set of wrestler names from 2K24 and 2K25 data."""
    all_w = set(WWE2K24_FULL_ROSTER)
    for brand_data in WWE2K24_DRAFTED_ROSTER.values():
        for gender_list in brand_data.values():
            all_w.update(gender_list)
    all_w.update(WWE2K25_KNOWN_WRESTLERS)
    return sorted(all_w - {""})


def get_drafted_brand(wrestler_name: str) -> str | None:
    """Return the brand ('RAW', 'SmackDown', 'NXT') a wrestler was drafted to in 2K24."""
    for brand, genders in WWE2K24_DRAFTED_ROSTER.items():
        for gender_list in genders.values():
            if wrestler_name in gender_list:
                return brand
    return None


def get_team_for_wrestler(wrestler_name: str) -> list[str]:
    """Return all team/stable names containing this wrestler."""
    teams = []
    for team_name, info in WWE2K24_TEAMS_FACTIONS.items():
        if wrestler_name in info["members"]:
            teams.append(team_name)
    return teams


# ──────────────────────────────────────────────
# Consolidated top-level dicts for convenience
# ──────────────────────────────────────────────

WWE2K24 = {
    "game": "WWE 2K24",
    "year": 2024,
    "full_roster": WWE2K24_FULL_ROSTER,
    "drafted_roster": WWE2K24_DRAFTED_ROSTER,
    "teams_factions": WWE2K24_TEAMS_FACTIONS,
    "championships": WWE2K24_CHAMPIONSHIPS,
}

WWE2K25 = {
    "game": "WWE 2K25",
    "year": 2025,
    "brands": WWE2K25_BRANDS,
    "championships": WWE2K25_CHAMPIONSHIPS,
    "special_titles": WWE2K25_SPECIAL_TITLES,
    "tournaments": WWE2K25_TOURNAMENTS,
    "monthly_schedule": WWE2K25_MONTHLY_SCHEDULE,
    "ppv_events": WWE2K25_PPV_EVENTS,
    "known_wrestlers": WWE2K25_KNOWN_WRESTLERS,
}


if __name__ == "__main__":
    print(f"WWE 2K24: {len(WWE2K24_FULL_ROSTER)} wrestlers, "
          f"{len(WWE2K24_TEAMS_FACTIONS)} teams/factions, "
          f"{len(WWE2K24_CHAMPIONSHIPS)} championships")
    print(f"WWE 2K25: {len(WWE2K25_BRANDS)} brands, "
          f"{len(WWE2K25_CHAMPIONSHIPS)} championship sheets, "
          f"{len(WWE2K25_SPECIAL_TITLES)} special titles, "
          f"{len(WWE2K25_TOURNAMENTS)} tournaments")
    print(f"Total unique wrestlers: {len(get_all_wrestlers())}")
