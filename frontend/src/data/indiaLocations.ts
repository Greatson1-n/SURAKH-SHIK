// Comprehensive Indian Geography (28 States & 8 Union Territories) and All Official Districts
// Designed for sovereign departmental credential provisioning in SURAKH-SHIK

export interface DistrictInfo {
  name: string;
  code: string;
}

export interface RankInfo {
  id: string;
  name: string;
  code: string; // e.g. "IO", "SHO", "FSL", "MAG", "PROS", "SYS"
  role: string; // matches backend role string
}

export interface DepartmentInfo {
  id: string;
  name: string;
  code: string; // e.g. "POL", "FOR", "JUD", "ADM"
  ranks: RankInfo[];
}

// 1. All 28 States and 8 Union Territories
export const INDIA_STATES: string[] = [
  "Manipur",
  "Assam",
  "Delhi (NCT)",
  "Maharashtra",
  "Uttar Pradesh",
  "Karnataka",
  "Tamil Nadu",
  "West Bengal",
  "Gujarat",
  "Punjab",
  "Rajasthan",
  "Kerala",
  "Madhya Pradesh",
  "Bihar",
  "Odisha",
  "Telangana",
  "Andhra Pradesh",
  "Haryana",
  "Jammu and Kashmir",
  "Jharkhand",
  "Chhattisgarh",
  "Uttarakhand",
  "Himachal Pradesh",
  "Tripura",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Goa",
  "Arunachal Pradesh",
  "Sikkim",
  "Ladakh",
  "Chandigarh",
  "Puducherry",
  "Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep"
];

// 2. Comprehensive District Mappings for All States & Union Territories
export const INDIA_DISTRICTS: Record<string, DistrictInfo[]> = {
  "Manipur": [
    { name: "Imphal West", code: "IMP" },
    { name: "Imphal East", code: "IME" },
    { name: "Bishnupur", code: "BSH" },
    { name: "Thoubal", code: "THB" },
    { name: "Churachandpur", code: "CCP" },
    { name: "Ukhrul", code: "UKH" },
    { name: "Senapati", code: "SPT" },
    { name: "Tamenglong", code: "TML" },
    { name: "Chandel", code: "CDL" },
    { name: "Kangpokpi", code: "KPI" },
    { name: "Jiribam", code: "JBM" },
    { name: "Kakching", code: "KCK" },
    { name: "Tengnoupal", code: "TNP" },
    { name: "Kamjong", code: "KMJ" },
    { name: "Noney", code: "NNY" },
    { name: "Pherzawl", code: "PZL" }
  ],
  "Assam": [
    { name: "Kamrup Metropolitan (Guwahati)", code: "GHY" },
    { name: "Kamrup", code: "KMR" },
    { name: "Cachar", code: "CCH" },
    { name: "Dibrugarh", code: "DBR" },
    { name: "Jorhat", code: "JRH" },
    { name: "Nagaon", code: "NGN" },
    { name: "Sonitpur", code: "STP" },
    { name: "Barpeta", code: "BPT" },
    { name: "Dhubri", code: "DHB" },
    { name: "Tinsukia", code: "TSK" },
    { name: "Golaghat", code: "GLG" },
    { name: "Sivasagar", code: "SVG" },
    { name: "Karbi Anglong", code: "KAN" },
    { name: "Darrang", code: "DRG" },
    { name: "Morigaon", code: "MRG" },
    { name: "Goalpara", code: "GLP" },
    { name: "Bongaigaon", code: "BGN" },
    { name: "Karimganj", code: "KMG" },
    { name: "Hailakandi", code: "HLK" },
    { name: "Dhemaji", code: "DMJ" },
    { name: "Lakhimpur", code: "LKP" },
    { name: "Nalbari", code: "NLB" },
    { name: "Baksa", code: "BKS" },
    { name: "Chirang", code: "CRG" },
    { name: "Kokrajhar", code: "KKJ" },
    { name: "Udalguri", code: "UDL" },
    { name: "Majuli", code: "MJL" },
    { name: "Hojai", code: "HOJ" },
    { name: "Charaideo", code: "CRD" },
    { name: "South Salmara-Mankachar", code: "SSM" },
    { name: "West Karbi Anglong", code: "WKA" },
    { name: "Biswanath", code: "BSW" },
    { name: "Bajali", code: "BJL" },
    { name: "Tamulpur", code: "TMP" }
  ],
  "Delhi (NCT)": [
    { name: "New Delhi", code: "DEL" },
    { name: "Central Delhi", code: "CDL" },
    { name: "East Delhi", code: "EDL" },
    { name: "North Delhi", code: "NDL" },
    { name: "North East Delhi", code: "NED" },
    { name: "North West Delhi", code: "NWD" },
    { name: "Shahdara", code: "SHD" },
    { name: "South Delhi", code: "SDL" },
    { name: "South East Delhi", code: "SED" },
    { name: "South West Delhi", code: "SWD" },
    { name: "West Delhi", code: "WDL" }
  ],
  "Maharashtra": [
    { name: "Mumbai City", code: "MUM" },
    { name: "Mumbai Suburban", code: "MSU" },
    { name: "Pune", code: "PUN" },
    { name: "Nagpur", code: "NGP" },
    { name: "Thane", code: "THN" },
    { name: "Nashik", code: "NSK" },
    { name: "Chhatrapati Sambhaji Nagar (Aurangabad)", code: "CSN" },
    { name: "Solapur", code: "SLP" },
    { name: "Amravati", code: "AMR" },
    { name: "Kolhapur", code: "KLP" },
    { name: "Nanded", code: "NND" },
    { name: "Sangli", code: "SNG" },
    { name: "Jalgaon", code: "JLG" },
    { name: "Akola", code: "AKL" },
    { name: "Latur", code: "LTR" },
    { name: "Dhule", code: "DHL" },
    { name: "Ahmednagar", code: "AHM" },
    { name: "Chandrapur", code: "CDP" },
    { name: "Parbhani", code: "PRB" },
    { name: "Jalna", code: "JLN" },
    { name: "Raigad", code: "RGD" },
    { name: "Satara", code: "STR" },
    { name: "Beed", code: "BED" },
    { name: "Yavatmal", code: "YTL" },
    { name: "Bhandara", code: "BHD" },
    { name: "Gondia", code: "GND" },
    { name: "Wardha", code: "WRD" },
    { name: "Dharashiv (Osmanabad)", code: "DHR" },
    { name: "Nandurbar", code: "NDB" },
    { name: "Ratnagiri", code: "RTG" },
    { name: "Sindhudurg", code: "SND" },
    { name: "Gadchiroli", code: "GDC" },
    { name: "Hingoli", code: "HNG" },
    { name: "Washim", code: "WSM" },
    { name: "Palghar", code: "PLG" }
  ],
  "Uttar Pradesh": [
    { name: "Lucknow", code: "LKO" },
    { name: "Kanpur Nagar", code: "KNP" },
    { name: "Varanasi", code: "VNS" },
    { name: "Prayagraj (Allahabad)", code: "PRY" },
    { name: "Agra", code: "AGR" },
    { name: "Meerut", code: "MRT" },
    { name: "Ghaziabad", code: "GZB" },
    { name: "Gautam Buddha Nagar (Noida)", code: "NOI" },
    { name: "Gorakhpur", code: "GKP" },
    { name: "Bareilly", code: "BLY" },
    { name: "Aligarh", code: "ALG" },
    { name: "Moradabad", code: "MBD" },
    { name: "Saharanpur", code: "SHR" },
    { name: "Ayodhya", code: "AYD" },
    { name: "Jhansi", code: "JHN" },
    { name: "Muzaffarnagar", code: "MZN" },
    { name: "Mathura", code: "MTH" },
    { name: "Firozabad", code: "FRZ" },
    { name: "Budaun", code: "BDN" },
    { name: "Rampur", code: "RMP" },
    { name: "Shahjahanpur", code: "SJP" },
    { name: "Farrukhabad", code: "FRK" },
    { name: "Sitapur", code: "STP" },
    { name: "Lakhimpur Kheri", code: "LKH" },
    { name: "Hardoi", code: "HRD" },
    { name: "Unnao", code: "UNN" },
    { name: "Rae Bareli", code: "RBL" },
    { name: "Barabanki", code: "BBK" },
    { name: "Sultanpur", code: "SLT" },
    { name: "Amethi", code: "AMT" },
    { name: "Pratapgarh", code: "PTG" },
    { name: "Fatehpur", code: "FTP" },
    { name: "Kaushambi", code: "KSH" },
    { name: "Banda", code: "BND" },
    { name: "Chitrakoot", code: "CTK" },
    { name: "Hamirpur", code: "HMP" },
    { name: "Mahoba", code: "MHB" },
    { name: "Jalaun", code: "JLN" },
    { name: "Lalitpur", code: "LLT" },
    { name: "Deoria", code: "DOR" },
    { name: "Kushinagar", code: "KSH" },
    { name: "Maharajganj", code: "MRJ" },
    { name: "Basti", code: "BST" },
    { name: "Sant Kabir Nagar", code: "SKN" },
    { name: "Siddharthnagar", code: "SDN" },
    { name: "Azamgarh", code: "AZM" },
    { name: "Mau", code: "MAU" },
    { name: "Ballia", code: "BLL" },
    { name: "Jaunpur", code: "JNP" },
    { name: "Ghazipur", code: "GZP" },
    { name: "Chandauli", code: "CDL" },
    { name: "Mirzapur", code: "MZP" },
    { name: "Sonbhadra", code: "SBD" },
    { name: "Bhadohi", code: "BDH" },
    { name: "Gonda", code: "GND" },
    { name: "Bahraich", code: "BRC" },
    { name: "Shravasti", code: "SRV" },
    { name: "Balrampur", code: "BLR" },
    { name: "Bijnor", code: "BJN" },
    { name: "Amroha", code: "AMR" },
    { name: "Sambhal", code: "SBH" },
    { name: "Hapur", code: "HPR" },
    { name: "Bulandshahr", code: "BLS" },
    { name: "Baghpat", code: "BGP" },
    { name: "Shamli", code: "SML" },
    { name: "Kasganj", code: "KSG" },
    { name: "Hathras", code: "HTR" },
    { name: "Etah", code: "ETH" },
    { name: "Mainpuri", code: "MNP" },
    { name: "Kannauj", code: "KNJ" },
    { name: "Etawah", code: "ETW" },
    { name: "Auraiya", code: "ARY" }
  ],
  "Karnataka": [
    { name: "Bengaluru Urban", code: "BLR" },
    { name: "Bengaluru Rural", code: "BLR" },
    { name: "Mysuru", code: "MYS" },
    { name: "Dharwad (Hubballi)", code: "DHW" },
    { name: "Dakshina Kannada (Mangaluru)", code: "MNG" },
    { name: "Belagavi", code: "BLG" },
    { name: "Kalaburagi", code: "KLB" },
    { name: "Ballari", code: "BLR" },
    { name: "Vijayapura", code: "VJP" },
    { name: "Shivamogga", code: "SHV" },
    { name: "Tumakuru", code: "TMK" },
    { name: "Davanagere", code: "DVG" },
    { name: "Bidar", code: "BDR" },
    { name: "Raichur", code: "RCR" },
    { name: "Bagalkote", code: "BGK" },
    { name: "Udupi", code: "UDP" },
    { name: "Hassan", code: "HSN" },
    { name: "Mandya", code: "MND" },
    { name: "Gadag", code: "GDG" },
    { name: "Chikkamagaluru", code: "CKM" },
    { name: "Haveri", code: "HVR" },
    { name: "Yadgir", code: "YDG" },
    { name: "Kolar", code: "KLR" },
    { name: "Chikkaballapura", code: "CKB" },
    { name: "Ramanagara", code: "RMN" },
    { name: "Chamarajanagar", code: "CRN" },
    { name: "Koppal", code: "KPL" },
    { name: "Chitradurga", code: "CTD" },
    { name: "Kodagu", code: "KDG" },
    { name: "Uttara Kannada", code: "UTK" },
    { name: "Vijayanagara", code: "VJN" }
  ],
  "Tamil Nadu": [
    { name: "Chennai", code: "CHN" },
    { name: "Coimbatore", code: "CBE" },
    { name: "Madurai", code: "MDU" },
    { name: "Tiruchirappalli", code: "TRY" },
    { name: "Salem", code: "SLM" },
    { name: "Tirunelveli", code: "TNV" },
    { name: "Tiruppur", code: "TPR" },
    { name: "Vellore", code: "VLR" },
    { name: "Erode", code: "ERD" },
    { name: "Thoothukudi", code: "TTK" },
    { name: "Dindigul", code: "DGL" },
    { name: "Thanjavur", code: "TNJ" },
    { name: "Ranipet", code: "RNP" },
    { name: "Sivaganga", code: "SVG" },
    { name: "Karur", code: "KRR" },
    { name: "Ramanathapuram", code: "RMN" },
    { name: "Virudhunagar", code: "VDN" },
    { name: "Kanchipuram", code: "KNC" },
    { name: "Tiruvallur", code: "TVL" },
    { name: "Chengalpattu", code: "CGP" },
    { name: "Cuddalore", code: "CDL" },
    { name: "Villupuram", code: "VLP" },
    { name: "Kallakurichi", code: "KLK" },
    { name: "Tiruvannamalai", code: "TVM" },
    { name: "Dharmapuri", code: "DMP" },
    { name: "Krishnagiri", code: "KRG" },
    { name: "Namakkal", code: "NMK" },
    { name: "Nilgiris", code: "NLG" },
    { name: "Perambalur", code: "PBL" },
    { name: "Ariyalur", code: "ARL" },
    { name: "Nagapattinam", code: "NGP" },
    { name: "Mayiladuthurai", code: "MYD" },
    { name: "Tiruvarur", code: "TVR" },
    { name: "Pudukkottai", code: "PDK" },
    { name: "Tenkasi", code: "TKS" },
    { name: "Kanyakumari", code: "KKM" }
  ],
  "West Bengal": [
    { name: "Kolkata", code: "KOL" },
    { name: "North 24 Parganas", code: "N24" },
    { name: "South 24 Parganas", code: "S24" },
    { name: "Howrah", code: "HWH" },
    { name: "Hooghly", code: "HGL" },
    { name: "Paschim Medinipur", code: "PMD" },
    { name: "Purba Medinipur", code: "EMD" },
    { name: "Darjeeling", code: "DJL" },
    { name: "Kalimpong", code: "KLP" },
    { name: "Jalpaiguri", code: "JPG" },
    { name: "Alipurduar", code: "APD" },
    { name: "Cooch Behar", code: "COB" },
    { name: "Malda", code: "MLD" },
    { name: "Murshidabad", code: "MSD" },
    { name: "Nadia", code: "NDA" },
    { name: "Birbhum", code: "BRB" },
    { name: "Bankura", code: "BKR" },
    { name: "Purulia", code: "PRL" },
    { name: "Purba Bardhaman", code: "EBD" },
    { name: "Paschim Bardhaman", code: "WBD" },
    { name: "Jhargram", code: "JHG" },
    { name: "Uttar Dinajpur", code: "UDJ" },
    { name: "Dakshin Dinajpur", code: "DDJ" }
  ],
  "Gujarat": [
    { name: "Ahmedabad", code: "AMD" },
    { name: "Surat", code: "SRT" },
    { name: "Vadodara", code: "BDQ" },
    { name: "Rajkot", code: "RJK" },
    { name: "Bhavnagar", code: "BVN" },
    { name: "Jamnagar", code: "JMN" },
    { name: "Junagadh", code: "JND" },
    { name: "Gandhinagar", code: "GND" },
    { name: "Anand", code: "AND" },
    { name: "Navsari", code: "NVS" },
    { name: "Morbi", code: "MRB" },
    { name: "Bharuch", code: "BRC" },
    { name: "Porbandar", code: "PBD" },
    { name: "Mehsana", code: "MSN" },
    { name: "Kutch", code: "KTC" },
    { name: "Surendranagar", code: "SRN" },
    { name: "Amreli", code: "AMR" },
    { name: "Kheda", code: "KHD" },
    { name: "Banaskantha", code: "BNK" },
    { name: "Sabarkantha", code: "SBK" },
    { name: "Panchmahal", code: "PNM" },
    { name: "Dahod", code: "DHD" },
    { name: "Valsad", code: "VLS" },
    { name: "Narmada", code: "NRM" },
    { name: "Tapi", code: "TAP" },
    { name: "Dang", code: "DNG" },
    { name: "Chhota Udepur", code: "CHU" },
    { name: "Mahisagar", code: "MSG" },
    { name: "Aravalli", code: "ARV" },
    { name: "Botad", code: "BTD" },
    { name: "Devbhumi Dwarka", code: "DWK" },
    { name: "Gir Somnath", code: "GSM" }
  ],
  "Punjab": [
    { name: "Amritsar", code: "ASR" },
    { name: "Ludhiana", code: "LDH" },
    { name: "Jalandhar", code: "JAL" },
    { name: "Patiala", code: "PTL" },
    { name: "Bathinda", code: "BTI" },
    { name: "SAS Nagar (Mohali)", code: "MHL" },
    { name: "Hoshiarpur", code: "HSP" },
    { name: "Pathankot", code: "PTK" },
    { name: "Moga", code: "MGA" },
    { name: "Firozpur", code: "FZP" },
    { name: "Kapurthala", code: "KPT" },
    { name: "Sangrur", code: "SGR" },
    { name: "Barnala", code: "BNL" },
    { name: "Faridkot", code: "FDK" },
    { name: "Fazilka", code: "FZK" },
    { name: "Fatehgarh Sahib", code: "FGS" },
    { name: "Gurdaspur", code: "GSP" },
    { name: "Mansa", code: "MNS" },
    { name: "Muktsar", code: "MKT" },
    { name: "SBS Nagar (Nawanshahr)", code: "SBS" },
    { name: "Rupnagar (Ropar)", code: "ROP" },
    { name: "Tarn Taran", code: "TRN" },
    { name: "Malerkotla", code: "MLK" }
  ],
  "Rajasthan": [
    { name: "Jaipur", code: "JPR" },
    { name: "Jodhpur", code: "JDH" },
    { name: "Kota", code: "KTA" },
    { name: "Bikaner", code: "BKN" },
    { name: "Ajmer", code: "AJM" },
    { name: "Udaipur", code: "UDP" },
    { name: "Bhilwara", code: "BLW" },
    { name: "Alwar", code: "ALW" },
    { name: "Bharatpur", code: "BHT" },
    { name: "Sikar", code: "SKR" },
    { name: "Pali", code: "PLI" },
    { name: "Sri Ganganagar", code: "SGN" },
    { name: "Hanumangarh", code: "HNM" },
    { name: "Chittorgarh", code: "CTG" },
    { name: "Jhunjhunu", code: "JJN" },
    { name: "Churu", code: "CRU" },
    { name: "Nagaur", code: "NGR" },
    { name: "Tonk", code: "TNK" },
    { name: "Barmer", code: "BMR" },
    { name: "Jaisalmer", code: "JSM" },
    { name: "Jalore", code: "JLR" },
    { name: "Sirohi", code: "SRH" },
    { name: "Banswara", code: "BSW" },
    { name: "Dungarpur", code: "DGP" },
    { name: "Pratapgarh", code: "PTG" },
    { name: "Rajsamand", code: "RJS" },
    { name: "Bundi", code: "BND" },
    { name: "Baran", code: "BRN" },
    { name: "Jhalawar", code: "JHL" },
    { name: "Sawai Madhopur", code: "SWM" },
    { name: "Dausa", code: "DSA" },
    { name: "Dholpur", code: "DLP" },
    { name: "Karauli", code: "KRL" }
  ],
  "Kerala": [
    { name: "Thiruvananthapuram", code: "TVM" },
    { name: "Ernakulam (Kochi)", code: "KOC" },
    { name: "Kozhikode", code: "KZK" },
    { name: "Thrissur", code: "TCR" },
    { name: "Kollam", code: "KLM" },
    { name: "Palakkad", code: "PLK" },
    { name: "Alappuzha", code: "ALP" },
    { name: "Kannur", code: "KNR" },
    { name: "Kottayam", code: "KTM" },
    { name: "Malappuram", code: "MLP" },
    { name: "Kasaragod", code: "KSD" },
    { name: "Idukki", code: "IDK" },
    { name: "Pathanamthitta", code: "PTA" },
    { name: "Wayanad", code: "WYD" }
  ],
  "Madhya Pradesh": [
    { name: "Bhopal", code: "BPL" },
    { name: "Indore", code: "IND" },
    { name: "Gwalior", code: "GWL" },
    { name: "Jabalpur", code: "JBP" },
    { name: "Ujjain", code: "UJN" },
    { name: "Sagar", code: "SGR" },
    { name: "Dewas", code: "DWS" },
    { name: "Satna", code: "STN" },
    { name: "Ratlam", code: "RTL" },
    { name: "Rewa", code: "RWA" },
    { name: "Katni", code: "KTN" },
    { name: "Singrauli", code: "SGL" },
    { name: "Burhanpur", code: "BHP" },
    { name: "Khandwa", code: "KHD" },
    { name: "Bhind", code: "BND" },
    { name: "Chhindwara", code: "CHW" },
    { name: "Guna", code: "GNA" },
    { name: "Shivpuri", code: "SVP" },
    { name: "Vidisha", code: "VDS" },
    { name: "Chhatarpur", code: "CTR" },
    { name: "Damoh", code: "DMH" },
    { name: "Mandsaur", code: "MDS" },
    { name: "Khargone", code: "KRG" },
    { name: "Neemuch", code: "NMC" },
    { name: "Narmadapuram", code: "NDP" },
    { name: "Sehore", code: "SHR" },
    { name: "Betul", code: "BTL" },
    { name: "Seoni", code: "SNI" },
    { name: "Datia", code: "DTA" }
  ],
  "Bihar": [
    { name: "Patna", code: "PAT" },
    { name: "Gaya", code: "GAY" },
    { name: "Bhagalpur", code: "BGL" },
    { name: "Muzaffarpur", code: "MZF" },
    { name: "Purnia", code: "PRN" },
    { name: "Darbhanga", code: "DBG" },
    { name: "Bihar Sharif (Nalanda)", code: "NLN" },
    { name: "Bhojpur (Arrah)", code: "ARH" },
    { name: "Begusarai", code: "BGS" },
    { name: "Katihar", code: "KTR" },
    { name: "Munger", code: "MNG" },
    { name: "Chhapra (Saran)", code: "SRN" },
    { name: "Saharsa", code: "SHS" },
    { name: "Sasaram (Rohtas)", code: "RTS" },
    { name: "Hajipur (Vaishali)", code: "VSH" },
    { name: "Siwan", code: "SWN" },
    { name: "Motihari (East Champaran)", code: "ECM" },
    { name: "Bettiah (West Champaran)", code: "WCM" },
    { name: "Nawada", code: "NWD" },
    { name: "Buxar", code: "BXR" },
    { name: "Kishanganj", code: "KSG" },
    { name: "Sitamarhi", code: "STM" },
    { name: "Jehanabad", code: "JHB" },
    { name: "Aurangabad", code: "AGB" },
    { name: "Samastipur", code: "SMS" },
    { name: "Madhubani", code: "MDB" }
  ],
  "Odisha": [
    { name: "Khordha (Bhubaneswar)", code: "BBI" },
    { name: "Cuttack", code: "CTC" },
    { name: "Ganjam", code: "GNJ" },
    { name: "Balasore", code: "BLS" },
    { name: "Sambalpur", code: "SBP" },
    { name: "Puri", code: "PRI" },
    { name: "Sundargarh (Rourkela)", code: "ROU" },
    { name: "Angul", code: "AGL" },
    { name: "Bargarh", code: "BGR" },
    { name: "Bhadrak", code: "BDK" },
    { name: "Bolangir", code: "BLN" },
    { name: "Dhenkanal", code: "DNK" },
    { name: "Jagatsinghpur", code: "JSP" },
    { name: "Jajpur", code: "JJP" },
    { name: "Jharsuguda", code: "JSG" },
    { name: "Kalahandi", code: "KLH" },
    { name: "Kendrapara", code: "KDP" },
    { name: "Keonjhar", code: "KJR" },
    { name: "Koraput", code: "KRP" },
    { name: "Mayurbhanj", code: "MBJ" },
    { name: "Rayagada", code: "RYG" }
  ],
  "Telangana": [
    { name: "Hyderabad", code: "HYD" },
    { name: "Warangal", code: "WGL" },
    { name: "Nizamabad", code: "NZB" },
    { name: "Karimnagar", code: "KRM" },
    { name: "Ramagundam (Peddapalli)", code: "RMG" },
    { name: "Khammam", code: "KMM" },
    { name: "Mahbubnagar", code: "MBN" },
    { name: "Nalgonda", code: "NLG" },
    { name: "Adilabad", code: "ADB" },
    { name: "Suryapet", code: "SRP" },
    { name: "Siddipet", code: "SDP" },
    { name: "Mancherial", code: "MCL" },
    { name: "Jagtial", code: "JGT" },
    { name: "Medchal-Malkajgiri", code: "MDM" },
    { name: "Rangareddy", code: "RRD" },
    { name: "Sangareddy", code: "SND" }
  ],
  "Andhra Pradesh": [
    { name: "Visakhapatnam", code: "VSK" },
    { name: "Vijayawada (NTR)", code: "BZA" },
    { name: "Guntur", code: "GNT" },
    { name: "Nellore", code: "NLR" },
    { name: "Kurnool", code: "KNL" },
    { name: "YSR Kadapa", code: "KDP" },
    { name: "Kakinada", code: "KKD" },
    { name: "Tirupati", code: "TPT" },
    { name: "Anantapur", code: "ATP" },
    { name: "Rajahmundry (East Godavari)", code: "RJY" },
    { name: "Eluru", code: "ELR" },
    { name: "Prakasam (Ongole)", code: "OGL" },
    { name: "Chittoor", code: "CTR" },
    { name: "Srikakulam", code: "SKM" },
    { name: "Vizianagaram", code: "VZM" }
  ],
  "Haryana": [
    { name: "Gurugram", code: "GGM" },
    { name: "Faridabad", code: "FBD" },
    { name: "Panipat", code: "PNP" },
    { name: "Ambala", code: "AMB" },
    { name: "Yamunanagar", code: "YNR" },
    { name: "Rohtak", code: "RTK" },
    { name: "Hisar", code: "HSR" },
    { name: "Karnal", code: "KNL" },
    { name: "Sonipat", code: "SNP" },
    { name: "Panchkula", code: "PKL" },
    { name: "Bhiwani", code: "BWN" },
    { name: "Sirsa", code: "SRS" },
    { name: "Rewari", code: "RWR" },
    { name: "Kurukshetra", code: "KRK" },
    { name: "Kaithal", code: "KTH" },
    { name: "Jind", code: "JND" }
  ],
  "Jammu and Kashmir": [
    { name: "Srinagar", code: "SXR" },
    { name: "Jammu", code: "JAM" },
    { name: "Anantnag", code: "ATG" },
    { name: "Baramulla", code: "BML" },
    { name: "Kathua", code: "KTH" },
    { name: "Udhampur", code: "UDH" },
    { name: "Kupwara", code: "KPW" },
    { name: "Budgam", code: "BDG" },
    { name: "Pulwama", code: "PLW" },
    { name: "Poonch", code: "PCH" },
    { name: "Rajouri", code: "RJR" },
    { name: "Doda", code: "DOD" }
  ],
  "Jharkhand": [
    { name: "Ranchi", code: "RNC" },
    { name: "East Singhbhum (Jamshedpur)", code: "JSR" },
    { name: "Dhanbad", code: "DHN" },
    { name: "Bokaro", code: "BKR" },
    { name: "Deoghar", code: "DGH" },
    { name: "Hazaribagh", code: "HZB" },
    { name: "Giridih", code: "GRD" },
    { name: "Ramgarh", code: "RMG" },
    { name: "Palamu", code: "PLM" },
    { name: "Dumka", code: "DMK" },
    { name: "Chaibasa (West Singhbhum)", code: "WSH" }
  ],
  "Chhattisgarh": [
    { name: "Raipur", code: "RPR" },
    { name: "Durg (Bhilai)", code: "DRG" },
    { name: "Bilaspur", code: "BSP" },
    { name: "Korba", code: "KRB" },
    { name: "Rajnandgaon", code: "RJN" },
    { name: "Raigarh", code: "RGH" },
    { name: "Jagdalpur (Bastar)", code: "BST" },
    { name: "Ambikapur (Surguja)", code: "SGJ" },
    { name: "Dhamtari", code: "DMT" },
    { name: "Kanker", code: "KNK" },
    { name: "Dantewada", code: "DTW" }
  ],
  "Uttarakhand": [
    { name: "Dehradun", code: "DDN" },
    { name: "Haridwar", code: "HDW" },
    { name: "Nainital (Haldwani)", code: "NTL" },
    { name: "Udham Singh Nagar (Rudrapur)", code: "USN" },
    { name: "Pauri Garhwal", code: "PRG" },
    { name: "Tehri Garhwal", code: "TRG" },
    { name: "Almora", code: "ALM" },
    { name: "Pithoragarh", code: "PTH" },
    { name: "Chamoli", code: "CML" },
    { name: "Uttarkashi", code: "UTK" }
  ],
  "Himachal Pradesh": [
    { name: "Shimla", code: "SML" },
    { name: "Kangra (Dharamshala)", code: "DHS" },
    { name: "Mandi", code: "MND" },
    { name: "Solan", code: "SLN" },
    { name: "Kullu", code: "KLU" },
    { name: "Sirmaur", code: "SMR" },
    { name: "Hamirpur", code: "HMP" },
    { name: "Una", code: "UNA" },
    { name: "Chamba", code: "CHB" },
    { name: "Bilaspur", code: "BLP" }
  ],
  "Tripura": [
    { name: "West Tripura (Agartala)", code: "AGT" },
    { name: "Gomati", code: "GMT" },
    { name: "South Tripura", code: "STR" },
    { name: "North Tripura", code: "NTR" },
    { name: "Dhalai", code: "DHL" },
    { name: "Unakoti", code: "UNK" },
    { name: "Khowai", code: "KHW" },
    { name: "Sepahijala", code: "SPH" }
  ],
  "Meghalaya": [
    { name: "East Khasi Hills (Shillong)", code: "SHL" },
    { name: "West Garo Hills (Tura)", code: "TRA" },
    { name: "West Khasi Hills", code: "WKH" },
    { name: "Ri-Bhoi", code: "RBH" },
    { name: "South Garo Hills", code: "SGH" },
    { name: "East Jaintia Hills", code: "EJH" },
    { name: "West Jaintia Hills", code: "WJH" }
  ],
  "Mizoram": [
    { name: "Aizawl", code: "AZL" },
    { name: "Lunglei", code: "LGL" },
    { name: "Champhai", code: "CMP" },
    { name: "Kolasib", code: "KLB" },
    { name: "Serchhip", code: "SCP" },
    { name: "Lawngtlai", code: "LTL" },
    { name: "Mamit", code: "MMT" },
    { name: "Siaha", code: "SIH" }
  ],
  "Nagaland": [
    { name: "Kohima", code: "KHM" },
    { name: "Dimapur", code: "DMP" },
    { name: "Mokokchung", code: "MKC" },
    { name: "Tuensang", code: "TSG" },
    { name: "Wokha", code: "WKH" },
    { name: "Zunheboto", code: "ZHB" },
    { name: "Phek", code: "PHK" },
    { name: "Mon", code: "MON" },
    { name: "Chumoukedima", code: "CKD" }
  ],
  "Goa": [
    { name: "North Goa (Panaji)", code: "PNJ" },
    { name: "South Goa (Margao)", code: "MGO" }
  ],
  "Arunachal Pradesh": [
    { name: "Papum Pare (Itanagar)", code: "ITN" },
    { name: "Changlang", code: "CHG" },
    { name: "West Kameng", code: "WKM" },
    { name: "East Kameng", code: "EKM" },
    { name: "Tawang", code: "TWG" },
    { name: "Tirap", code: "TRP" },
    { name: "Lower Subansiri", code: "LSB" },
    { name: "Upper Subansiri", code: "USB" },
    { name: "Lohit", code: "LHT" }
  ],
  "Sikkim": [
    { name: "Gangtok", code: "GTK" },
    { name: "Namchi", code: "NMC" },
    { name: "Mangan", code: "MGN" },
    { name: "Gyalshing", code: "GLS" },
    { name: "Pakyong", code: "PKY" },
    { name: "Soreng", code: "SRG" }
  ],
  "Ladakh": [
    { name: "Leh", code: "LEH" },
    { name: "Kargil", code: "KGL" }
  ],
  "Chandigarh": [
    { name: "Chandigarh", code: "CHD" }
  ],
  "Puducherry": [
    { name: "Puducherry", code: "PDY" },
    { name: "Karaikal", code: "KRK" },
    { name: "Mahe", code: "MAH" },
    { name: "Yanam", code: "YNM" }
  ],
  "Andaman and Nicobar Islands": [
    { name: "South Andaman (Port Blair)", code: "PBL" },
    { name: "North & Middle Andaman", code: "NMA" },
    { name: "Nicobar", code: "NCB" }
  ],
  "Dadra and Nagar Haveli and Daman and Diu": [
    { name: "Daman", code: "DMN" },
    { name: "Diu", code: "DIU" },
    { name: "Dadra & Nagar Haveli (Silvassa)", code: "SLV" }
  ],
  "Lakshadweep": [
    { name: "Kavaratti", code: "KVR" },
    { name: "Agatti", code: "AGT" },
    { name: "Andrott", code: "AND" }
  ]
};

// 3. Departmental & Rank Configurations with Standardized Shortcut Codes
export const DEPARTMENTS: DepartmentInfo[] = [
  {
    id: "POLICE",
    name: "Police Department (Law & Order / CID / Cyber)",
    code: "POL",
    ranks: [
      {
        id: "IO",
        name: "Investigating Officer (IO)",
        code: "IO",
        role: "INVESTIGATING_OFFICER"
      },
      {
        id: "SHO",
        name: "Station House Officer (SHO)",
        code: "SHO",
        role: "STATION_HOUSE_OFFICER"
      },
      {
        id: "CYB_OFF",
        name: "Cyber Crime Officer (CCO)",
        code: "CYB",
        role: "INVESTIGATING_OFFICER"
      },
      {
        id: "SP",
        name: "Superintendent of Police (SP / SSP)",
        code: "SP",
        role: "STATION_HOUSE_OFFICER"
      }
    ]
  },
  {
    id: "FORENSIC",
    name: "Forensic Science Laboratory (FSL / CFSL)",
    code: "FOR",
    ranks: [
      {
        id: "FSL_ANL",
        name: "Forensic Science Analyst / Examiner",
        code: "FSL",
        role: "FORENSIC_ANALYST"
      },
      {
        id: "CYB_EXAM",
        name: "Cyber Forensics & Digital Evidence Examiner",
        code: "CYB",
        role: "FORENSIC_ANALYST"
      },
      {
        id: "BAL_EXP",
        name: "Ballistics & Explosives Expert",
        code: "BAL",
        role: "FORENSIC_ANALYST"
      },
      {
        id: "DNA_EXAM",
        name: "DNA & Serology Expert",
        code: "DNA",
        role: "FORENSIC_ANALYST"
      },
      {
        id: "FSL_DIR",
        name: "Director / Senior Scientific Officer (FSL)",
        code: "DIR",
        role: "FORENSIC_ANALYST"
      }
    ]
  },
  {
    id: "JUDICIARY",
    name: "Judiciary & District Courts",
    code: "JUD",
    ranks: [
      {
        id: "DSJ",
        name: "Principal District & Sessions Judge",
        code: "DSJ",
        role: "JUDICIAL_MAGISTRATE"
      },
      {
        id: "CJM",
        name: "Chief Judicial Magistrate (CJM)",
        code: "CJM",
        role: "JUDICIAL_MAGISTRATE"
      },
      {
        id: "POC_JDG",
        name: "Special POCSO / Crimes Against Women Judge",
        code: "POC",
        role: "JUDICIAL_MAGISTRATE"
      },
      {
        id: "JMFC",
        name: "Judicial Magistrate First Class (JMFC)",
        code: "MAG",
        role: "JUDICIAL_MAGISTRATE"
      },
      {
        id: "HCJ",
        name: "High Court Appellate Bench Justice",
        code: "HCJ",
        role: "JUDICIAL_MAGISTRATE"
      }
    ]
  },
  {
    id: "PROSECUTION",
    name: "Directorate of Prosecution",
    code: "PRO",
    ranks: [
      {
        id: "PP",
        name: "Public Prosecutor (Sessions Court)",
        code: "PP",
        role: "PUBLIC_PROSECUTOR"
      },
      {
        id: "APP",
        name: "Assistant Public Prosecutor (CJM Court)",
        code: "APP",
        role: "PUBLIC_PROSECUTOR"
      },
      {
        id: "DOP",
        name: "Director of Prosecution (State HQ)",
        code: "DOP",
        role: "PUBLIC_PROSECUTOR"
      }
    ]
  },
  {
    id: "ADMIN",
    name: "Homeland Security & IT Administration",
    code: "ADM",
    ranks: [
      {
        id: "SYS",
        name: "System Administrator",
        code: "SYS",
        role: "SYSTEM_ADMIN"
      }
    ]
  }
];

// 4. Contextual Facility / Station / Lab / Bench Directory Generator
export interface FacilityOption {
  name: string;
  code: string;
  category: string;
}

export function getDepartmentFacilities(
  state: string,
  district: string,
  deptId: string
): FacilityOption[] {
  const safeState = state || "Manipur";
  const safeDistrict = district || "Imphal West";

  switch (deptId) {
    case "FORENSIC": {
      const facilities: FacilityOption[] = [
        {
          name: `State Forensic Science Laboratory (SFSL) - ${safeDistrict}, ${safeState}`,
          code: `${safeDistrict.slice(0, 3).toUpperCase()}-SFSL`,
          category: "State FSL"
        },
        {
          name: `Regional Forensic Science Laboratory (RFSL) - ${safeDistrict}`,
          code: `${safeDistrict.slice(0, 3).toUpperCase()}-RFSL`,
          category: "Regional FSL"
        },
        {
          name: `District Mobile Forensic Unit (DMFU) - ${safeDistrict}`,
          code: `${safeDistrict.slice(0, 3).toUpperCase()}-DMFU`,
          category: "Mobile Unit"
        },
        {
          name: `Cyber Forensics & Digital Evidence Division - ${safeDistrict}`,
          code: `${safeDistrict.slice(0, 3).toUpperCase()}-CYB-FSL`,
          category: "Digital Forensics"
        }
      ];

      // Add national and premier regional centres
      if (safeState === "Manipur" || safeState === "Assam" || safeState === "Meghalaya" || safeState === "Nagaland" || safeState === "Mizoram" || safeState === "Tripura" || safeState === "Arunachal Pradesh") {
        facilities.push({
          name: "CFSL Kamrup / Guwahati (Cyber Forensics Hub)",
          code: "CFSL-KAMRUP-GUW",
          category: "Central FSL (NE Hub)"
        });
        facilities.push({
          name: "State Forensic Science Lab (Pangei, Manipur)",
          code: "MN-SFSL-IMPHAL",
          category: "State FSL Main Lab"
        });
      }
      if (safeState === "Delhi (NCT)") {
        facilities.push({
          name: "FSL Rohini Delhi (Cyber & DNA Division)",
          code: "DL-SFSL-ROH",
          category: "State FSL Delhi"
        });
      }
      facilities.push({
        name: "CFSL New Delhi (CBI Headquarters)",
        code: "CFSL-NEW-DELHI",
        category: "Central FSL CBI"
      });
      facilities.push({
        name: "CFSL Hyderabad (Digital Forensics & Ballistics)",
        code: "CFSL-HYDERABAD",
        category: "Central FSL"
      });
      facilities.push({
        name: "CFSL Chandigarh (DNA & Questioned Documents)",
        code: "CFSL-CHANDIGARH",
        category: "Central FSL"
      });
      return facilities;
    }

    case "JUDICIARY": {
      return [
        {
          name: `Principal District & Sessions Court (${safeDistrict})`,
          code: `${safeDistrict.slice(0, 3).toUpperCase()}-SESS-CRT`,
          category: "District Sessions Court"
        },
        {
          name: `Chief Judicial Magistrate (CJM) Bench (${safeDistrict})`,
          code: `${safeDistrict.slice(0, 3).toUpperCase()}-CJM-CRT`,
          category: "Magistrate Court"
        },
        {
          name: `Special POCSO / Fast Track Court (${safeDistrict})`,
          code: `${safeDistrict.slice(0, 3).toUpperCase()}-POCSO-CRT`,
          category: "Special Fast Track Court"
        },
        {
          name: `Judicial Magistrate First Class (JMFC) Court (${safeDistrict})`,
          code: `${safeDistrict.slice(0, 3).toUpperCase()}-JMFC-CRT`,
          category: "JMFC Court"
        },
        {
          name: `High Court of ${safeState} (Principal / Circuit Bench)`,
          code: `${safeState.slice(0, 3).toUpperCase()}-HIGH-CRT`,
          category: "High Court Bench"
        }
      ];
    }

    case "PROSECUTION": {
      return [
        {
          name: `Office of Public Prosecutor - Sessions Court (${safeDistrict})`,
          code: `${safeDistrict.slice(0, 3).toUpperCase()}-PP-OFFICE`,
          category: "Sessions Prosecution"
        },
        {
          name: `Office of Assistant Public Prosecutor - CJM Court (${safeDistrict})`,
          code: `${safeDistrict.slice(0, 3).toUpperCase()}-APP-OFFICE`,
          category: "Magistrate Prosecution"
        },
        {
          name: `Special Prosecution Cell (POCSO & Cyber Crimes) - ${safeDistrict}`,
          code: `${safeDistrict.slice(0, 3).toUpperCase()}-SPC-OFFICE`,
          category: "Specialized Prosecution"
        },
        {
          name: `Directorate of Prosecution - State HQ (${safeState})`,
          code: `${safeState.slice(0, 3).toUpperCase()}-DOP-HQ`,
          category: "Directorate HQ"
        }
      ];
    }

    case "POLICE":
    default: {
      return [
        {
          name: `City / Headquarters Police Station (${safeDistrict})`,
          code: `${safeDistrict.slice(0, 3).toUpperCase()}-CITY-PS`,
          category: "Headquarters Police Station"
        },
        {
          name: `Cyber Crime Police Station (${safeDistrict})`,
          code: `${safeDistrict.slice(0, 3).toUpperCase()}-CYB-PS`,
          category: "Specialized Cyber Station"
        },
        {
          name: `Women & Child Protection Police Station (${safeDistrict})`,
          code: `${safeDistrict.slice(0, 3).toUpperCase()}-WOMEN-PS`,
          category: "Specialized Women Station"
        },
        {
          name: `District Crime Records Bureau (DCRB) - ${safeDistrict}`,
          code: `${safeDistrict.slice(0, 3).toUpperCase()}-DCRB`,
          category: "Crime Records Bureau"
        },
        {
          name: `Superintendent of Police (SP) Headquarters - ${safeDistrict}`,
          code: `${safeDistrict.slice(0, 3).toUpperCase()}-SP-HQ`,
          category: "District Command HQ"
        }
      ];
    }
  }
}

// 5. Smart Name Slug Generation
export function formatNameSlug(name: string): string {
  if (!name) return "";
  // Strip formal prefixes like SI, IO, SHO, Dr, Mr, Shri, Smt, etc.
  const clean = name.replace(/^(SI|IO|SHO|Dr\.?|Mr\.?|Mrs\.?|Ms\.?|Shri|Smt\.?|Inspector|Justice)\s+/i, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  // Priority to target name (e.g. "Klinton" -> "KLNTON", "Mayanglambam Sumit" -> "SUMIT")
  const target = words.length > 1 ? words[words.length - 1] : words[0];
  const upper = target.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Specific rule for KLINTON -> KLNTON as requested
  if (upper === "KLINTON") {
    return "KLNTON";
  }

  // Compress if long
  if (upper.length > 6) {
    const first = upper[0];
    const rest = upper.slice(1);
    const compressed = first + rest.replace(/[AEIOU]/g, "");
    if (compressed.length >= 3 && compressed.length <= 8) {
      return compressed;
    }
  }
  return upper.slice(0, 8);
}

// 6. Dynamic Badge / Username Generator
export function generateBadgeId(
  deptCode: string,
  rankCode: string,
  districtCode: string,
  fullName: string
): string {
  const d = (deptCode || "POL").toUpperCase();
  const r = (rankCode || "IO").toUpperCase();
  const dist = (districtCode || "IMP").toUpperCase();
  const nameSlug = formatNameSlug(fullName);

  if (!nameSlug) {
    return `${d}-${r}-${dist}`;
  }
  return `${d}-${r}-${dist}-${nameSlug}`;
}
