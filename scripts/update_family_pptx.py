import json

with open('c:/Users/kefor/Desktop/GIT/family-tree/data/family.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def find_node(node, target_id):
    if node.get('id') == target_id:
        return node
    for child in node.get('children', []):
        result = find_node(child, target_id)
        if result:
            return result
    return None

# 1. Update Hubert Vennes Fortney
hubert = find_node(data, 'hubert_vennes')
hubert['birthplace'] = 'Wheeler, WI'
hubert['deathplace'] = 'Woodale, IL'
hubert['occupation'] = 'Electrical engineer'
hubert['spouse'] = 'Evelyn Matilda Yaun'
hubert['marriageplace'] = 'Minneapolis, MN'
hubert['notes'] = 'Son of Albert Christian Fortney. Married Evelyn Matilda Yaun (b. 23 December 1920, Knapp WI; worked for Sears, retired). 1 son, 2 granddaughters, 4 great-granddaughters.'

# 2. Update Virgil Fortney
virgil = find_node(data, 'virgil_fortney')
virgil['birthplace'] = 'Wheeler, WI'
virgil['occupation'] = 'Sales'
virgil['marriageplace'] = 'Seminole, Oklahoma'
virgil['marriagedate'] = '15 June 1946'
virgil['notes'] = 'Son of Albert Christian Fortney. Married Betty Baker (b. 18 December 1927; wife, mom, sales, hairdresser), 15 June 1946, Seminole OK (div. 1962). 2 sons, 1 daughter, 1 granddaughter.'

philip = find_node(data, 'philip_virgil')
philip['name'] = 'Phillip Fortney'
philip['birth'] = 1948
philip['birthplace'] = '16 August 1948'
philip['occupation'] = 'Guidance Counselor (retired)'
philip['spouse'] = 'Ngoc Kim Duan'
philip['notes'] = 'Married Ngoc Kim Duan (Saigon, Vietnam, b. 18 Aug 1966). No children.'

robert_v = find_node(data, 'robert_virgil')
robert_v['birth'] = 1953
robert_v['birthplace'] = '23 November 1953'
robert_v['occupation'] = 'Director, Ortho & Neurological ICU at Northwestern Hospital in Chicago'
robert_v['notes'] = 'Partner: Mark Schmantz (Tenor, Chicago Opera).'

marcia_v = find_node(data, 'marcia_virgil')
marcia_v['birth'] = 1951
marcia_v['birthplace'] = '8 February 1951'
marcia_v['occupation'] = 'Executive recruiter'
marcia_v['name'] = 'Marcia Attmore Fortney'
marcia_v['notes'] = 'Married Dick Weber 1973 (div.). Married Wynn Blair 1985; 1 daughter Leslie Blair (b. 8 April 1986, Oakfield CT). Married George Attmore (computer consultant) 1999; no children.'

# 3. Update Adrian Hilman Dahl
adrian = find_node(data, 'adrian_dahl')
adrian['occupation'] = 'Nuclear Physicist; Professor'
adrian['birthplace'] = 'Wheeler, WI'
adrian['deathplace'] = 'Loveland, CO'
adrian['marriagedate'] = 'February 1942'
adrian['marriageplace'] = 'Rochester, NY'
adrian['notes'] = 'Nuclear Physicist, Professor. 1st of 4 wives: Virginia Dahl (b. 28 January 1921, Robinson KS; d. 1983, Ft. Collins). 1 son, 1 daughter. 3 grandsons + 4 adopted grandchildren. Visited Fortun, Norway.'

# 4. Update Monrad Dahl with spouse and 5 missing children
monrad = find_node(data, 'monrad_dahl')
monrad['spouse'] = 'Jeanette (Jan) Higgins'
monrad['occupation'] = 'Teacher; Recreation Therapist'
monrad['birthplace'] = '28 August 1921'
monrad['notes'] = 'Teacher; Recreation Therapist. Married Jeanette (Jan) Higgins (b. 7 January 1922; teacher, musician, occupational therapist), June 1946/47. 6 children, 14 grandchildren, 5 great-grandchildren.'

existing_jon = find_node(data, 'jon_arthur_dahl')
existing_jon['occupation'] = 'Scientist; ecologist'

new_monrad_children = [
    {
        "id": "david_frederick_dahl",
        "name": "David Frederick Dahl",
        "birth": 1948,
        "birthplace": "24 October 1948, Glenwood City WI",
        "gender": "M",
        "branch": "fortney",
        "occupation": "Minister, psychologist",
        "spouse": "Maritza Gerbrandy",
        "notes": "1 son, 2 daughters."
    },
    {
        "id": "mark_thomas_dahl",
        "name": "Mark Thomas Dahl",
        "birth": 1951,
        "birthplace": "14 August 1951, Harmony, MN",
        "gender": "M",
        "branch": "fortney",
        "occupation": "Orthopedic surgeon",
        "spouse": "Katherine Killeen",
        "notes": "3 daughters: Dana Marie, Lindsay, Jenny."
    },
    {
        "id": "deborah_susan_dahl",
        "name": "Deborah Susan Dahl",
        "birth": 1953,
        "birthplace": "30 March 1953, St. Paul, MN",
        "gender": "F",
        "branch": "fortney",
        "occupation": "Occupational Therapist",
        "spouse": "Peter Van Wolvelaerd (div.)",
        "notes": "2 daughters: Megan, Arielle."
    },
    {
        "id": "daniel_stephen_dahl",
        "name": "Daniel Stephen Dahl",
        "birth": 1957,
        "birthplace": "21 January 1957, St. Cloud, MN",
        "gender": "M",
        "branch": "fortney",
        "occupation": "Computer Programmer",
        "spouse": "Joni Hall",
        "notes": "1 son (Andrew), 1 daughter (Sarah)."
    },
    {
        "id": "peder_monrad_dahl",
        "name": "Peder Monrad Dahl",
        "birth": 1963,
        "birthplace": "30 April 1963, St. Cloud, MN",
        "gender": "M",
        "branch": "fortney",
        "occupation": "Physical Therapist",
        "spouse": "Cristy Harris",
        "notes": "1 son (Alex), 1 daughter (Katerine)."
    }
]
monrad['children'] = monrad.get('children', []) + new_monrad_children

# 5. Update Frederick Dahl (Nettie's son) with spouse and children
fred_dahl = find_node(data, 'frederick_dahl')
fred_dahl['spouse'] = 'Rosemary'
fred_dahl['birthplace'] = '10 September 1923'
fred_dahl.pop('death', None)
fred_dahl['notes'] = 'Son of Nettie Fortney & Frederick Dahl. Married Rosemary.'
fred_dahl['children'] = [
    {
        "id": "tolana_marie_dahl",
        "name": "Tolana Marie Dahl",
        "birth": 1950,
        "birthplace": "28 January 1950",
        "gender": "F",
        "branch": "fortney",
        "spouse": "Charles Brown",
        "notes": "1 daughter: Deanna."
    },
    {
        "id": "frederick_thomas_dahl_jr",
        "name": "Frederick Thomas Dahl Jr.",
        "birth": 1951,
        "birthplace": "25 May 1951",
        "gender": "M",
        "branch": "fortney",
        "occupation": "Military",
        "notes": "Died in military service."
    },
    {
        "id": "edward_luke_dahl",
        "name": "Edward Luke Dahl",
        "birth": 1951,
        "death": 1969,
        "birthplace": "19 August 1951",
        "deathplace": "31 July 1969",
        "gender": "M",
        "branch": "fortney",
        "notes": "Died in tractor accident on a farm."
    },
    {
        "id": "randi_elizabeth_dahl",
        "name": "Randi Elizabeth Dahl",
        "birth": 1953,
        "birthplace": "25 November 1953",
        "gender": "F",
        "branch": "fortney"
    },
    {
        "id": "steven_kendal_dahl",
        "name": "Steven Kendal Dahl",
        "birth": 1955,
        "birthplace": "25 March 1955",
        "gender": "M",
        "branch": "fortney",
        "spouse": "Sylvia",
        "notes": "1 son: Tommie."
    }
]

# 6. Update Sylvia Dahl
sylvia = find_node(data, 'sylvia_dahl')
sylvia['notes'] = 'Born 25 February 1926, Baldwin WI. Daughter of Nettie Fortney & Frederick Dahl. First married Warren Kromroy; son Tom William Kromroy (b. 26 September 1951). Second married Richard Goll (d. 11 May 2005, Huntington PA).'

tom = find_node(data, 'tom_kromroy')
tom['birth'] = 1951
tom['birthplace'] = '26 September 1951'
tom['spouse'] = 'Kathy'
tom['name'] = 'Tom William Kromroy'

marie_jean_exists = find_node(data, 'marie_jean_kromroy')
if not marie_jean_exists:
    sylvia['children'].append({
        "id": "marie_jean_kromroy",
        "name": "Marie Jean Kromroy",
        "gender": "F",
        "branch": "fortney",
        "notes": "Daughter of Sylvia Dahl Kromroy."
    })

warren_exists = find_node(data, 'warren_kromroy')
if not warren_exists:
    if 'children' not in tom:
        tom['children'] = []
    tom['children'].insert(0, {
        "id": "warren_kromroy",
        "name": "Warren Kromroy",
        "birth": 1980,
        "gender": "M",
        "branch": "fortney"
    })

# 7. Update Hillman Arnold Fortney with children
hillman = find_node(data, 'hillman_fortney')
hillman['birthplace'] = 'Wheeler, WI'
hillman['marriagedate'] = '13 July 1944'
hillman['marriageplace'] = 'Pontiac, MI'
hillman['notes'] = 'Son of Clarence Edward Fortney. Married Mildred Irene Wedell Smith (b. 29 July 1922 Sandstone MN; d. 12 June 2007 Columbia TN; Credit Manager J.C. Penney ret.). 4 children, 5 grandchildren, 6 great-grandchildren.'
hillman['children'] = [
    {
        "id": "wayne_wedell_fortney",
        "name": "Wayne Alan Wedell Fortney",
        "birth": 1950,
        "birthplace": "19 December 1950, Pontiac, MI",
        "gender": "M",
        "branch": "fortney",
        "spouse": "Henrietta Pruitt",
        "notes": "4 daughters."
    },
    {
        "id": "lynn_ann_fortney",
        "name": "Lynn Ann Fortney",
        "birth": 1954,
        "birthplace": "24 May 1954, Pontiac, MI",
        "gender": "F",
        "branch": "fortney",
        "spouse": "Richard Eugene Robb Jr.",
        "notes": "No children."
    },
    {
        "id": "lee_james_fortney",
        "name": "Lee James Fortney",
        "birth": 1954,
        "birthplace": "24 May 1954, Pontiac, MI",
        "gender": "M",
        "branch": "fortney",
        "notes": "Twin of Lynn Ann. No children."
    },
    {
        "id": "deborah_sue_fortney",
        "name": "Deborah Sue Fortney",
        "birth": 1960,
        "birthplace": "14 January 1960, Pontiac, MI",
        "gender": "F",
        "branch": "fortney",
        "spouse": "Peter Betanio",
        "notes": "1 son Jeremy; 1 grandson."
    }
]

# 8. Update Agnes Marie Fortney with children
agnes = find_node(data, 'agnes_fortney')
agnes['birthplace'] = 'Wheeler, WI'
agnes['marriagedate'] = '13 September 1941'
agnes['marriageplace'] = 'Pontiac, MI'
agnes['notes'] = 'Daughter of Clarence Edward Fortney. Married Richard Platt Deason (b. 8 March 1922 Murphysboro IL; d. 13 May 1995 Grayling MI), 13 September 1941, Pontiac MI. 3 daughters.'
agnes['children'] = [
    {
        "id": "karol_marie_deason",
        "name": "Karol Marie Deason",
        "birth": 1943,
        "birthplace": "10 May 1943, Chicago, IL",
        "gender": "F",
        "branch": "fortney",
        "spouse": "Howard Orlie Lutman",
        "notes": "1 son, 2 daughters."
    },
    {
        "id": "sylvia_jean_deason",
        "name": "Sylvia Jean Deason Munshaw",
        "birth": 1946,
        "birthplace": "16 May 1946, Pontiac, MI",
        "gender": "F",
        "branch": "fortney",
        "spouse": "John Wesley Munshaw",
        "notes": "1 son: Wesley."
    },
    {
        "id": "adele_janiece_deason",
        "name": "Adele Janiece Deason",
        "birth": 1949,
        "death": 1973,
        "birthplace": "8 May 1949, Pontiac, MI",
        "deathplace": "18 July 1973, Warren, MI",
        "gender": "F",
        "branch": "fortney",
        "spouse": "Kim Leroy Howard",
        "notes": "Died age 24. No descendants."
    }
]

# 9. Update Ralph Fortney with more children
ralph = find_node(data, 'ralph_fortney')
ralph['marriagedate'] = '26 July 1952'
ralph['marriageplace'] = 'Pontiac, MI'
ralph['notes'] = 'Son of Clarence Edward Fortney. Married Phyllis (Marjorie) Ann Welton (b. 29 March 1932, Oakland County MI), 26 July 1952, Pontiac MI. 2 daughters, 2 sons.'

anita_m_exists = find_node(data, 'anita_marie_fortney')
if not anita_m_exists:
    ralph['children'].append({
        "id": "anita_marie_fortney",
        "name": "Anita Marie Fortney",
        "birth": 1957,
        "birthplace": "9 December 1957, Pontiac, MI",
        "gender": "F",
        "branch": "fortney",
        "notes": "Married Joseph Austin Tackett (no descendants). Also married Thomas Martin Frame; 2 sons."
    })

tk_ralph_exists = find_node(data, 'thomas_kendall_fortney_r')
if not tk_ralph_exists:
    ralph['children'].append({
        "id": "thomas_kendall_fortney_r",
        "name": "Thomas Kendall Fortney",
        "birth": 1963,
        "birthplace": "10 June 1963, Pontiac, MI",
        "gender": "M",
        "branch": "fortney"
    })

# 10. Update Christine Ellen Fortney with children
christine = find_node(data, 'christine_fortney')
christine['occupation'] = 'Nurse Assistant (retired); Farming'
christine['notes'] = 'Daughter of Henry Martin Fortney. Nurse Assistant (retired), then farmer. 1st married Ken Faber (25 Aug 1962, div. 1977). 2nd married Rolph Anderson (b. 14 Dec 1929 Chippewa Falls; d. 18 Apr 1997 Cadott WI). 4 children, 4 step-children; 9 grandchildren + 2 step & 2 adopted; 3 great-grandchildren.'
christine['children'] = [
    {
        "id": "kevin_lee_faber",
        "name": "Kevin Lee Faber",
        "birth": 1963,
        "birthplace": "3 February 1963, Menomonie WI",
        "gender": "M",
        "branch": "fortney",
        "occupation": "Machinist",
        "spouse": "Wanda Ann Nye",
        "notes": "1 daughter: Jessica Ann; 3 sons: Jacob David, Jarrod William, Joshua Lee."
    },
    {
        "id": "laura_faber_konwinski",
        "name": "Laura Faber Konwinski",
        "birth": 1964,
        "birthplace": "1 October 1964, Menomonie WI",
        "gender": "F",
        "branch": "fortney",
        "occupation": "Sales",
        "spouse": "Dale R. Konwinski",
        "notes": "1 son, 1 step-son."
    },
    {
        "id": "jennifer_faber_kysilko",
        "name": "Jennifer Faber Kysilko",
        "birth": 1967,
        "birthplace": "16 October 1967, Eau Claire WI",
        "gender": "F",
        "branch": "fortney",
        "occupation": "Real estate",
        "spouse": "Robert Frank Kysilko",
        "notes": "2 daughters + 1 step."
    },
    {
        "id": "erick_thomas_faber",
        "name": "Erick Thomas Faber",
        "birth": 1970,
        "birthplace": "3 December 1970, Eau Claire WI",
        "gender": "M",
        "branch": "fortney",
        "occupation": "Career US Army",
        "spouse": "Racheal Ann Melton",
        "notes": "1 son, 1 daughter, 2 adopted."
    },
    {
        "id": "jonathon_richard_anderson",
        "name": "Jonathon Richard Anderson",
        "birth": 1953,
        "birthplace": "20 September 1953, Chippewa Falls, WI",
        "gender": "M",
        "branch": "fortney",
        "occupation": "Mechanical Engineer",
        "spouse": "Debbie Melville",
        "notes": "Step-son of Christine via Rolph Anderson. 2 sons: Jason, Ryan."
    },
    {
        "id": "tammy_ann_anderson",
        "name": "Tammy Ann Anderson",
        "birth": 1967,
        "birthplace": "18 November 1967",
        "gender": "F",
        "branch": "fortney",
        "occupation": "Kitchen Designer",
        "spouse": "Terry Steinmetz",
        "notes": "Step-daughter of Christine via Rolph Anderson. 2 step-sons: Brandon, Jerrod."
    },
    {
        "id": "james_valentine_anderson",
        "name": "James Valentine Anderson",
        "birth": 1957,
        "birthplace": "1 January 1957, Chippewa Falls",
        "gender": "M",
        "branch": "fortney",
        "occupation": "UND PhD Bio-Chemistry",
        "spouse": "Jan Kistler",
        "notes": "Step-son of Christine via Rolph Anderson. 2 sons, 1 adopted daughter."
    },
    {
        "id": "richard_rolf_anderson",
        "name": "Richard Rolf Anderson",
        "birth": 1971,
        "birthplace": "4 May 1971",
        "gender": "M",
        "branch": "fortney",
        "notes": "Step-son of Christine via Rolph Anderson. First partner: Jessica Fletty; 1 son Zachary. Second partner: Lisa Johnson; 1 son (Kaleb), 1 adopted son (Brendon)."
    }
]

# 11. Update Karn Louise Fortney with children
karn = find_node(data, 'karn_fortney')
karn['birthplace'] = 'Wheeler, WI'
karn['occupation'] = 'Art Teacher (retired)'
karn['notes'] = 'Daughter of Henry Martin Fortney. Art Teacher (retired). 1st married Richard Rock (San Diego 1974, divorced); 4 sons. 2nd married Orrin Anderson (Las Vegas; b. 8 June 1937, Eau Claire WI; salesman retired).'
karn['children'] = [
    {
        "id": "anthony_thomas_rock",
        "name": "Anthony Thomas Rock",
        "birth": 1975,
        "birthplace": "6 February 1975, San Diego, California",
        "gender": "M",
        "branch": "fortney",
        "occupation": "Food service"
    },
    {
        "id": "daniel_james_rock",
        "name": "Daniel James Rock",
        "birth": 1976,
        "birthplace": "22 August 1976, Menomonee, Wisconsin",
        "gender": "M",
        "branch": "fortney",
        "occupation": "Insurance, accountant"
    },
    {
        "id": "steven_richard_rock",
        "name": "Steven Richard Rock",
        "birth": 1978,
        "birthplace": "20 June 1978, Menomonee, Wisconsin",
        "gender": "M",
        "branch": "fortney",
        "occupation": "Physics career"
    },
    {
        "id": "thomas_michael_rock",
        "name": "Thomas Michael Rock",
        "birth": 1981,
        "birthplace": "10 September 1981, Menomonee, Wisconsin",
        "gender": "M",
        "branch": "fortney",
        "occupation": "Chef"
    }
]

# 12. Update Orland Larson with children
orland = find_node(data, 'orland_larson')
orland['birthplace'] = '14 February 1944'
orland['occupation'] = 'Marketing, Hewlett-Packard (ret.); Business Owner'
orland['spouse'] = 'Kathleen Lucille Shanahan Larson'
orland['notes'] = 'Son of Myrtle Susanna Fortney & Andrew Larson. Married Kathleen Lucille Shanahan Larson (b. 1 July 1947; Real Estate Agent/Property Manager ret.). 2 sons, 1 granddaughter.'
orland['children'] = [
    {
        "id": "daniel_patrick_larson",
        "name": "Daniel Patrick Larson",
        "birth": 1965,
        "birthplace": "1 October 1965, Washington DC",
        "gender": "M",
        "branch": "fortney",
        "occupation": "Computer Consultant, Business owner",
        "spouse": "Julia Szabo",
        "notes": "Married Julia Szabo, 3 July 1999, Budapest Hungary. 1 daughter: Izabelle (b. 2 Aug 2005)."
    },
    {
        "id": "eric_orland_larson",
        "name": "Eric Orland Larson",
        "birth": 1972,
        "birthplace": "16 October 1972, Mountain View, CA",
        "gender": "M",
        "branch": "fortney",
        "occupation": "Real estate broker/business owner"
    }
]

# 13. Update Anita Linnea Fortney Harms with husband and child
anita = find_node(data, 'anita_linnea_f')
anita['name'] = 'Anita Linnea Fortney Harms'
anita['occupation'] = 'Teacher (retired), creative dramatics'
anita['spouse'] = 'Burl (Bill) Harms'
anita['marriagedate'] = '29 July 1972'
anita['marriageplace'] = 'Muskegon, Michigan'
anita['notes'] = 'Daughter of Albin Leonard Fortney. Teacher (retired), creative dramatics. Married Burl (Bill) Harms (b. 26 March 1947; broadcaster retired, sales), 29 July 1972, Muskegon MI.'
anita['children'] = [
    {
        "id": "robin_harms",
        "name": "Robin Harms",
        "birth": 1980,
        "birthplace": "29 January 1980, Muskegon, MI",
        "gender": "F",
        "branch": "fortney",
        "spouse": "Nathan Kingsley",
        "marriagedate": "27 December 2006",
        "marriageplace": "Muskegon, MI",
        "notes": "Married Nathan Kingsley (b. 10 July 1978, Columbus OH), 27 December 2006, Muskegon MI. No children as of 2007."
    }
]

# 14. Add Aaron Richard Olson to Linda Larson children
linda = find_node(data, 'linda_larson')
aaron_exists = any(c.get('id') == 'aaron_richard_olson' for c in linda.get('children', []))
if not aaron_exists:
    linda['children'].insert(0, {
        "id": "aaron_richard_olson",
        "name": "Aaron Richard Olson",
        "birth": 1968,
        "birthplace": "13 February 1968, Minneapolis MN",
        "gender": "M",
        "branch": "fortney",
        "occupation": "Teacher",
        "spouse": "Elizabeth",
        "notes": "1 son, 1 daughter."
    })

# 15. Add Thomas Jefferson and Maureen Larson to Thomas Larson
thomas_lar = find_node(data, 'thomas_larson')
thomas_lar['marriagedate'] = '28 December 1958'
thomas_lar['notes'] = 'Computer Data Specialist. 1st marriage 28 December 1958 (div. 1963). 2nd wife Kathleen D. Koehler (b. 30 December 1937, bookkeeper). 1 living son Kerry.'

tj_exists = find_node(data, 'thomas_jefferson_larson')
if not tj_exists:
    thomas_lar['children'].append({
        "id": "thomas_jefferson_larson",
        "name": "Thomas Jefferson Larson",
        "birth": 1961,
        "death": 1961,
        "birthplace": "4 July 1961",
        "deathplace": "5 July 1961",
        "gender": "M",
        "branch": "fortney",
        "notes": "Died one day after birth."
    })

mau_exists = find_node(data, 'maureen_larson')
if not mau_exists:
    thomas_lar['children'].append({
        "id": "maureen_larson",
        "name": "Maureen Larson",
        "birth": 1962,
        "death": 1962,
        "gender": "F",
        "branch": "fortney",
        "notes": "Died in infancy 1962."
    })

# 16. Add Josh Andrew Madsen to Laurel Larson children
laurel = find_node(data, 'laurel_larson')
josh_exists = find_node(data, 'josh_andrew_madsen')
if not josh_exists:
    laurel['children'].insert(0, {
        "id": "josh_andrew_madsen",
        "name": "Josh Andrew Madsen",
        "birth": 1974,
        "birthplace": "12 July 1974",
        "gender": "M",
        "branch": "fortney",
        "occupation": "Custodian",
        "notes": "No children."
    })

with open('c:/Users/kefor/Desktop/GIT/family-tree/data/family.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Done writing family.json")
