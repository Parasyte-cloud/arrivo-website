// Shared country calling-code data, detection and validation, used anywhere a
// phone/WhatsApp number is collected (registration, contact).
//
// Plain data and plain functions, no library: every country calling code, with a
// per-country min/max national-number length so the most common mistake (wrong
// country, or a number that obviously doesn't fit) is caught. The table below is
// generated from Google's libphonenumber metadata (the "phonenumbers" package,
// v9.0.41): re-generate it rather than editing it by hand. Nigeria and the
// first 19 countries keep the hand-checked lengths this site has always used.
//
// Table format: REGION|+dial|Name|minLen|maxLen, separated by ";". A trailing
// "|m" marks the main country for a calling code that several countries share.
var ARRIVO_COUNTRY_TABLE = "NG|+234|Nigeria|10|10|m;GH|+233|Ghana|9|9|m;BJ|+229|Benin|8|8|m;NE|+227|Niger|8|8|m;TG|+228|Togo|8|8|m;CI|+225|Côte d'Ivoire|8|10|m;CM|+237|Cameroon|9|9|m;SN|+221|Senegal|9|9|m;GB|+44|United Kingdom|10|10|m;US|+1|United States|10|10|m;CA|+1|Canada|10|10;FR|+33|France|9|9|m;DE|+49|Germany|10|11|m;CN|+86|China|11|11|m;IN|+91|India|10|10|m;PT|+351|Portugal|9|9|m;BR|+55|Brazil|10|11|m;ES|+34|Spain|9|9|m;ZA|+27|South Africa|9|9|m;AE|+971|United Arab Emirates|9|9|m;AF|+93|Afghanistan|9|9|m;AL|+355|Albania|9|9|m;DZ|+213|Algeria|9|9|m;AS|+1|American Samoa|10|10;AD|+376|Andorra|6|9|m;AO|+244|Angola|9|9|m;AI|+1|Anguilla|10|10;AG|+1|Antigua and Barbuda|10|10;AR|+54|Argentina|10|11|m;AM|+374|Armenia|8|8|m;AW|+297|Aruba|7|7|m;AC|+247|Ascension Island|5|5|m;AU|+61|Australia|9|9|m;AT|+43|Austria|7|13|m;AZ|+994|Azerbaijan|9|9|m;BS|+1|Bahamas|10|10;BH|+973|Bahrain|8|8|m;BD|+880|Bangladesh|10|10|m;BB|+1|Barbados|10|10;BY|+375|Belarus|9|9|m;BE|+32|Belgium|9|9|m;BZ|+501|Belize|7|7|m;BM|+1|Bermuda|10|10;BT|+975|Bhutan|8|8|m;BO|+591|Bolivia|8|8|m;BA|+387|Bosnia and Herzegovina|8|9|m;BW|+267|Botswana|8|8|m;IO|+246|British Indian Ocean Territory|7|7|m;BN|+673|Brunei|7|7|m;BG|+359|Bulgaria|8|9|m;BF|+226|Burkina Faso|8|8|m;BI|+257|Burundi|8|8|m;KH|+855|Cambodia|8|9|m;CV|+238|Cape Verde|7|7|m;BQ|+599|Caribbean Netherlands|7|7;KY|+1|Cayman Islands|10|10;CF|+236|Central African Republic|8|8|m;TD|+235|Chad|8|8|m;CL|+56|Chile|9|9|m;CX|+61|Christmas Island|9|9;CC|+61|Cocos (Keeling) Islands|9|9;CO|+57|Colombia|10|10|m;KM|+269|Comoros|7|7|m;CG|+242|Congo|9|9|m;CK|+682|Cook Islands|5|5|m;CR|+506|Costa Rica|8|8|m;HR|+385|Croatia|8|9|m;CU|+53|Cuba|8|8|m;CW|+599|Curaçao|7|8|m;CY|+357|Cyprus|8|8|m;CZ|+420|Czechia|9|9|m;DK|+45|Denmark|8|8|m;DJ|+253|Djibouti|8|8|m;DM|+1|Dominica|10|10;DO|+1|Dominican Republic|10|10;CD|+243|DR Congo|7|9|m;EC|+593|Ecuador|9|9|m;EG|+20|Egypt|10|10|m;SV|+503|El Salvador|8|8|m;GQ|+240|Equatorial Guinea|9|9|m;ER|+291|Eritrea|7|7|m;EE|+372|Estonia|7|8|m;SZ|+268|Eswatini|8|8|m;ET|+251|Ethiopia|9|9|m;FK|+500|Falkland Islands|5|5|m;FO|+298|Faroe Islands|6|6|m;FJ|+679|Fiji|7|7|m;FI|+358|Finland|6|10|m;GF|+594|French Guiana|9|9|m;PF|+689|French Polynesia|8|8|m;GA|+241|Gabon|7|8|m;GM|+220|Gambia|7|9|m;GE|+995|Georgia|9|9|m;GI|+350|Gibraltar|8|8|m;GR|+30|Greece|10|10|m;GL|+299|Greenland|6|6|m;GD|+1|Grenada|10|10;GP|+590|Guadeloupe|9|9|m;GU|+1|Guam|10|10;GT|+502|Guatemala|8|8|m;GG|+44|Guernsey|10|10;GN|+224|Guinea|9|9|m;GW|+245|Guinea-Bissau|9|9|m;GY|+592|Guyana|7|7|m;HT|+509|Haiti|8|8|m;HN|+504|Honduras|8|8|m;HK|+852|Hong Kong|8|8|m;HU|+36|Hungary|9|9|m;IS|+354|Iceland|7|9|m;ID|+62|Indonesia|9|12|m;IR|+98|Iran|10|10|m;IQ|+964|Iraq|10|10|m;IE|+353|Ireland|9|9|m;IM|+44|Isle of Man|10|10;IL|+972|Israel|9|9|m;IT|+39|Italy|9|10|m;JM|+1|Jamaica|10|10;JP|+81|Japan|10|10|m;JE|+44|Jersey|10|10;JO|+962|Jordan|9|9|m;KZ|+7|Kazakhstan|10|10;KE|+254|Kenya|9|9|m;KI|+686|Kiribati|8|8|m;XK|+383|Kosovo|8|8|m;KW|+965|Kuwait|8|8|m;KG|+996|Kyrgyzstan|9|9|m;LA|+856|Laos|9|10|m;LV|+371|Latvia|8|8|m;LB|+961|Lebanon|7|8|m;LS|+266|Lesotho|8|8|m;LR|+231|Liberia|7|9|m;LY|+218|Libya|9|9|m;LI|+423|Liechtenstein|7|9|m;LT|+370|Lithuania|8|8|m;LU|+352|Luxembourg|9|9|m;MO|+853|Macao|8|8|m;MG|+261|Madagascar|9|9|m;MW|+265|Malawi|9|9|m;MY|+60|Malaysia|9|10|m;MV|+960|Maldives|7|7|m;ML|+223|Mali|8|8|m;MT|+356|Malta|8|8|m;MH|+692|Marshall Islands|7|7|m;MQ|+596|Martinique|9|9|m;MR|+222|Mauritania|8|8|m;MU|+230|Mauritius|8|8|m;YT|+262|Mayotte|9|9;MX|+52|Mexico|10|10|m;FM|+691|Micronesia|7|7|m;MD|+373|Moldova|8|8|m;MC|+377|Monaco|8|9|m;MN|+976|Mongolia|8|8|m;ME|+382|Montenegro|8|8|m;MS|+1|Montserrat|10|10;MA|+212|Morocco|9|9|m;MZ|+258|Mozambique|9|9|m;MM|+95|Myanmar|7|10|m;NA|+264|Namibia|9|9|m;NR|+674|Nauru|7|7|m;NP|+977|Nepal|10|10|m;NL|+31|Netherlands|9|11|m;NC|+687|New Caledonia|6|6|m;NZ|+64|New Zealand|8|10|m;NI|+505|Nicaragua|8|8|m;NU|+683|Niue|4|7|m;NF|+672|Norfolk Island|6|6|m;KP|+850|North Korea|10|10|m;MK|+389|North Macedonia|8|8|m;MP|+1|Northern Mariana Islands|10|10;NO|+47|Norway|8|8|m;OM|+968|Oman|8|8|m;PK|+92|Pakistan|10|10|m;PW|+680|Palau|7|7|m;PS|+970|Palestine|9|9|m;PA|+507|Panama|7|8|m;PG|+675|Papua New Guinea|8|8|m;PY|+595|Paraguay|9|9|m;PE|+51|Peru|9|9|m;PH|+63|Philippines|10|10|m;PL|+48|Poland|9|9|m;PR|+1|Puerto Rico|10|10;QA|+974|Qatar|8|8|m;RO|+40|Romania|9|9|m;RU|+7|Russia|10|10|m;RW|+250|Rwanda|9|9|m;RE|+262|Réunion|9|9|m;BL|+590|Saint Barthélemy|9|9;SH|+290|Saint Helena|5|5|m;KN|+1|Saint Kitts and Nevis|10|10;LC|+1|Saint Lucia|10|10;MF|+590|Saint Martin|9|9;PM|+508|Saint Pierre and Miquelon|6|9|m;VC|+1|Saint Vincent|10|10;WS|+685|Samoa|7|10|m;SM|+378|San Marino|8|8|m;ST|+239|Sao Tome and Principe|7|7|m;SA|+966|Saudi Arabia|9|9|m;RS|+381|Serbia|8|10|m;SC|+248|Seychelles|7|7|m;SL|+232|Sierra Leone|8|8|m;SG|+65|Singapore|8|8|m;SX|+1|Sint Maarten|10|10;SK|+421|Slovakia|9|9|m;SI|+386|Slovenia|8|8|m;SB|+677|Solomon Islands|5|7|m;SO|+252|Somalia|7|9|m;KR|+82|South Korea|9|10|m;SS|+211|South Sudan|9|9|m;LK|+94|Sri Lanka|9|9|m;SD|+249|Sudan|9|9|m;SR|+597|Suriname|7|7|m;SJ|+47|Svalbard and Jan Mayen|8|8;SE|+46|Sweden|9|9|m;CH|+41|Switzerland|9|9|m;SY|+963|Syria|9|9|m;TW|+886|Taiwan|9|9|m;TJ|+992|Tajikistan|9|9|m;TZ|+255|Tanzania|9|9|m;TH|+66|Thailand|9|9|m;TL|+670|Timor-Leste|8|8|m;TK|+690|Tokelau|4|7|m;TO|+676|Tonga|7|7|m;TT|+1|Trinidad and Tobago|10|10;TA|+290|Tristan da Cunha|4|4;TN|+216|Tunisia|8|8|m;TM|+993|Turkmenistan|8|8|m;TC|+1|Turks and Caicos Islands|10|10;TV|+688|Tuvalu|6|7|m;TR|+90|Türkiye|10|10|m;UG|+256|Uganda|9|9|m;UA|+380|Ukraine|9|9|m;UY|+598|Uruguay|8|8|m;UZ|+998|Uzbekistan|9|9|m;VU|+678|Vanuatu|7|7|m;VA|+39|Vatican City|9|10;VE|+58|Venezuela|10|10|m;VN|+84|Vietnam|9|9|m;VG|+1|Virgin Islands, British|10|10;VI|+1|Virgin Islands, U.S.|10|10;WF|+681|Wallis and Futuna|6|6|m;EH|+212|Western Sahara|9|9;YE|+967|Yemen|9|9|m;ZM|+260|Zambia|9|9|m;ZW|+263|Zimbabwe|9|9|m;AX|+358|Åland Islands|6|10";

// +1 is shared by the US, Canada and a couple of dozen Caribbean countries. The
// area code (first 3 digits) tells them apart; anything not listed is the US.
var ARRIVO_NANP_AREA = "CA=204,226,236,249,250,257,263,273,289,306,343,354,365,367,368,382,403,416,418,428,431,437,438,450,468,474,506,514,519,548,579,581,584,587,604,613,639,647,672,683,705,709,742,753,778,780,782,807,819,825,867,873,879,902,905,942;BS=242;BB=246;AI=264;AG=268;VG=284;VI=340;KY=345;BM=441;GD=473;TC=649;JM=658,876;MS=664;MP=670;GU=671;AS=684;SX=721;LC=758;DM=767;VC=784;PR=787,939;DO=809,829,849;TT=868;KN=869";

// Time zone -> country, used to pick a sensible default before the visitor types.
var ARRIVO_TZ_REGION = "Africa/Abidjan=CI;Africa/Accra=GH;Africa/Addis_Ababa=ET;Africa/Algiers=DZ;Africa/Asmara=ER;Africa/Bamako=ML;Africa/Bangui=CF;Africa/Banjul=GM;Africa/Bissau=GW;Africa/Blantyre=MW;Africa/Brazzaville=CG;Africa/Bujumbura=BI;Africa/Cairo=EG;Africa/Casablanca=MA;Africa/Ceuta=ES;Africa/Conakry=GN;Africa/Dakar=SN;Africa/Dar_es_Salaam=TZ;Africa/Djibouti=DJ;Africa/Douala=CM;Africa/El_Aaiun=EH;Africa/Freetown=SL;Africa/Gaborone=BW;Africa/Harare=ZW;Africa/Johannesburg=ZA;Africa/Juba=SS;Africa/Kampala=UG;Africa/Khartoum=SD;Africa/Kigali=RW;Africa/Kinshasa=CD;Africa/Lagos=NG;Africa/Libreville=GA;Africa/Lome=TG;Africa/Luanda=AO;Africa/Lubumbashi=CD;Africa/Lusaka=ZM;Africa/Malabo=GQ;Africa/Maputo=MZ;Africa/Maseru=LS;Africa/Mbabane=SZ;Africa/Mogadishu=SO;Africa/Monrovia=LR;Africa/Nairobi=KE;Africa/Ndjamena=TD;Africa/Niamey=NE;Africa/Nouakchott=MR;Africa/Ouagadougou=BF;Africa/Porto-Novo=BJ;Africa/Sao_Tome=ST;Africa/Tripoli=LY;Africa/Tunis=TN;Africa/Windhoek=NA;America/Adak=US;America/Anchorage=US;America/Anguilla=AI;America/Antigua=AG;America/Araguaina=BR;America/Argentina/Buenos_Aires=AR;America/Argentina/Catamarca=AR;America/Argentina/Cordoba=AR;America/Argentina/Jujuy=AR;America/Argentina/La_Rioja=AR;America/Argentina/Mendoza=AR;America/Argentina/Rio_Gallegos=AR;America/Argentina/Salta=AR;America/Argentina/San_Juan=AR;America/Argentina/San_Luis=AR;America/Argentina/Tucuman=AR;America/Argentina/Ushuaia=AR;America/Aruba=AW;America/Asuncion=PY;America/Atikokan=CA;America/Bahia=BR;America/Bahia_Banderas=MX;America/Barbados=BB;America/Belem=BR;America/Belize=BZ;America/Blanc-Sablon=CA;America/Boa_Vista=BR;America/Bogota=CO;America/Boise=US;America/Cambridge_Bay=CA;America/Campo_Grande=BR;America/Cancun=MX;America/Caracas=VE;America/Cayenne=GF;America/Cayman=KY;America/Chicago=US;America/Chihuahua=MX;America/Ciudad_Juarez=MX;America/Costa_Rica=CR;America/Coyhaique=CL;America/Creston=CA;America/Cuiaba=BR;America/Curacao=CW;America/Danmarkshavn=GL;America/Dawson=CA;America/Dawson_Creek=CA;America/Denver=US;America/Detroit=US;America/Dominica=DM;America/Edmonton=CA;America/Eirunepe=BR;America/El_Salvador=SV;America/Fort_Nelson=CA;America/Fortaleza=BR;America/Glace_Bay=CA;America/Goose_Bay=CA;America/Grand_Turk=TC;America/Grenada=GD;America/Guadeloupe=GP;America/Guatemala=GT;America/Guayaquil=EC;America/Guyana=GY;America/Halifax=CA;America/Havana=CU;America/Hermosillo=MX;America/Indiana/Indianapolis=US;America/Indiana/Knox=US;America/Indiana/Marengo=US;America/Indiana/Petersburg=US;America/Indiana/Tell_City=US;America/Indiana/Vevay=US;America/Indiana/Vincennes=US;America/Indiana/Winamac=US;America/Inuvik=CA;America/Iqaluit=CA;America/Jamaica=JM;America/Juneau=US;America/Kentucky/Louisville=US;America/Kentucky/Monticello=US;America/Kralendijk=BQ;America/La_Paz=BO;America/Lima=PE;America/Los_Angeles=US;America/Lower_Princes=SX;America/Maceio=BR;America/Managua=NI;America/Manaus=BR;America/Marigot=MF;America/Martinique=MQ;America/Matamoros=MX;America/Mazatlan=MX;America/Menominee=US;America/Merida=MX;America/Metlakatla=US;America/Mexico_City=MX;America/Miquelon=PM;America/Moncton=CA;America/Monterrey=MX;America/Montevideo=UY;America/Montserrat=MS;America/Nassau=BS;America/New_York=US;America/Nome=US;America/Noronha=BR;America/North_Dakota/Beulah=US;America/North_Dakota/Center=US;America/North_Dakota/New_Salem=US;America/Nuuk=GL;America/Ojinaga=MX;America/Panama=PA;America/Paramaribo=SR;America/Phoenix=US;America/Port-au-Prince=HT;America/Port_of_Spain=TT;America/Porto_Velho=BR;America/Puerto_Rico=PR;America/Punta_Arenas=CL;America/Rankin_Inlet=CA;America/Recife=BR;America/Regina=CA;America/Resolute=CA;America/Rio_Branco=BR;America/Santarem=BR;America/Santiago=CL;America/Santo_Domingo=DO;America/Sao_Paulo=BR;America/Scoresbysund=GL;America/Sitka=US;America/St_Barthelemy=BL;America/St_Johns=CA;America/St_Kitts=KN;America/St_Lucia=LC;America/St_Thomas=VI;America/St_Vincent=VC;America/Swift_Current=CA;America/Tegucigalpa=HN;America/Thule=GL;America/Tijuana=MX;America/Toronto=CA;America/Tortola=VG;America/Vancouver=CA;America/Whitehorse=CA;America/Winnipeg=CA;America/Yakutat=US;Antarctica/Macquarie=AU;Arctic/Longyearbyen=SJ;Asia/Aden=YE;Asia/Almaty=KZ;Asia/Amman=JO;Asia/Anadyr=RU;Asia/Aqtau=KZ;Asia/Aqtobe=KZ;Asia/Ashgabat=TM;Asia/Atyrau=KZ;Asia/Baghdad=IQ;Asia/Bahrain=BH;Asia/Baku=AZ;Asia/Bangkok=TH;Asia/Barnaul=RU;Asia/Beirut=LB;Asia/Bishkek=KG;Asia/Brunei=BN;Asia/Chita=RU;Asia/Colombo=LK;Asia/Damascus=SY;Asia/Dhaka=BD;Asia/Dili=TL;Asia/Dubai=AE;Asia/Dushanbe=TJ;Asia/Famagusta=CY;Asia/Gaza=PS;Asia/Hebron=PS;Asia/Ho_Chi_Minh=VN;Asia/Hong_Kong=HK;Asia/Hovd=MN;Asia/Irkutsk=RU;Asia/Jakarta=ID;Asia/Jayapura=ID;Asia/Jerusalem=IL;Asia/Kabul=AF;Asia/Kamchatka=RU;Asia/Karachi=PK;Asia/Kathmandu=NP;Asia/Khandyga=RU;Asia/Kolkata=IN;Asia/Krasnoyarsk=RU;Asia/Kuala_Lumpur=MY;Asia/Kuching=MY;Asia/Kuwait=KW;Asia/Macau=MO;Asia/Magadan=RU;Asia/Makassar=ID;Asia/Manila=PH;Asia/Muscat=OM;Asia/Nicosia=CY;Asia/Novokuznetsk=RU;Asia/Novosibirsk=RU;Asia/Omsk=RU;Asia/Oral=KZ;Asia/Phnom_Penh=KH;Asia/Pontianak=ID;Asia/Pyongyang=KP;Asia/Qatar=QA;Asia/Qostanay=KZ;Asia/Qyzylorda=KZ;Asia/Riyadh=SA;Asia/Sakhalin=RU;Asia/Samarkand=UZ;Asia/Seoul=KR;Asia/Shanghai=CN;Asia/Singapore=SG;Asia/Srednekolymsk=RU;Asia/Taipei=TW;Asia/Tashkent=UZ;Asia/Tbilisi=GE;Asia/Tehran=IR;Asia/Thimphu=BT;Asia/Tokyo=JP;Asia/Tomsk=RU;Asia/Ulaanbaatar=MN;Asia/Urumqi=CN;Asia/Ust-Nera=RU;Asia/Vientiane=LA;Asia/Vladivostok=RU;Asia/Yakutsk=RU;Asia/Yangon=MM;Asia/Yekaterinburg=RU;Asia/Yerevan=AM;Atlantic/Azores=PT;Atlantic/Bermuda=BM;Atlantic/Canary=ES;Atlantic/Cape_Verde=CV;Atlantic/Faroe=FO;Atlantic/Madeira=PT;Atlantic/Reykjavik=IS;Atlantic/St_Helena=SH;Atlantic/Stanley=FK;Australia/Adelaide=AU;Australia/Brisbane=AU;Australia/Broken_Hill=AU;Australia/Darwin=AU;Australia/Eucla=AU;Australia/Hobart=AU;Australia/Lindeman=AU;Australia/Lord_Howe=AU;Australia/Melbourne=AU;Australia/Perth=AU;Australia/Sydney=AU;Europe/Amsterdam=NL;Europe/Andorra=AD;Europe/Astrakhan=RU;Europe/Athens=GR;Europe/Belgrade=RS;Europe/Berlin=DE;Europe/Bratislava=SK;Europe/Brussels=BE;Europe/Bucharest=RO;Europe/Budapest=HU;Europe/Busingen=DE;Europe/Chisinau=MD;Europe/Copenhagen=DK;Europe/Dublin=IE;Europe/Gibraltar=GI;Europe/Guernsey=GG;Europe/Helsinki=FI;Europe/Isle_of_Man=IM;Europe/Istanbul=TR;Europe/Jersey=JE;Europe/Kaliningrad=RU;Europe/Kirov=RU;Europe/Kyiv=UA;Europe/Lisbon=PT;Europe/Ljubljana=SI;Europe/London=GB;Europe/Luxembourg=LU;Europe/Madrid=ES;Europe/Malta=MT;Europe/Mariehamn=AX;Europe/Minsk=BY;Europe/Monaco=MC;Europe/Moscow=RU;Europe/Oslo=NO;Europe/Paris=FR;Europe/Podgorica=ME;Europe/Prague=CZ;Europe/Riga=LV;Europe/Rome=IT;Europe/Samara=RU;Europe/San_Marino=SM;Europe/Sarajevo=BA;Europe/Saratov=RU;Europe/Simferopol=UA;Europe/Skopje=MK;Europe/Sofia=BG;Europe/Stockholm=SE;Europe/Tallinn=EE;Europe/Tirane=AL;Europe/Ulyanovsk=RU;Europe/Vaduz=LI;Europe/Vatican=VA;Europe/Vienna=AT;Europe/Vilnius=LT;Europe/Volgograd=RU;Europe/Warsaw=PL;Europe/Zagreb=HR;Europe/Zurich=CH;Indian/Antananarivo=MG;Indian/Chagos=IO;Indian/Christmas=CX;Indian/Cocos=CC;Indian/Comoro=KM;Indian/Mahe=SC;Indian/Maldives=MV;Indian/Mauritius=MU;Indian/Mayotte=YT;Indian/Reunion=RE;Pacific/Apia=WS;Pacific/Auckland=NZ;Pacific/Bougainville=PG;Pacific/Chatham=NZ;Pacific/Chuuk=FM;Pacific/Easter=CL;Pacific/Efate=VU;Pacific/Fakaofo=TK;Pacific/Fiji=FJ;Pacific/Funafuti=TV;Pacific/Galapagos=EC;Pacific/Gambier=PF;Pacific/Guadalcanal=SB;Pacific/Guam=GU;Pacific/Honolulu=US;Pacific/Kanton=KI;Pacific/Kiritimati=KI;Pacific/Kosrae=FM;Pacific/Kwajalein=MH;Pacific/Majuro=MH;Pacific/Marquesas=PF;Pacific/Nauru=NR;Pacific/Niue=NU;Pacific/Norfolk=NF;Pacific/Noumea=NC;Pacific/Pago_Pago=AS;Pacific/Palau=PW;Pacific/Pohnpei=FM;Pacific/Port_Moresby=PG;Pacific/Rarotonga=CK;Pacific/Saipan=MP;Pacific/Tahiti=PF;Pacific/Tarawa=KI;Pacific/Tongatapu=TO;Pacific/Wallis=WF";

var ARRIVO_COUNTRY_CODES = ARRIVO_COUNTRY_TABLE.split(";").map(function (row) {
  var p = row.split("|");
  return { code: p[0], dial: p[1], name: p[2], minLen: +p[3], maxLen: +p[4], main: p[5] === "m" };
});

var ARRIVO_PRIORITY_COUNT = 20; // shown first, before the full alphabetical list

var ARRIVO_AREA_TO_REGION = (function () {
  var map = {};
  ARRIVO_NANP_AREA.split(";").forEach(function (g) {
    var kv = g.split("=");
    kv[1].split(",").forEach(function (npa) { map[npa] = kv[0]; });
  });
  return map;
})();

function arrivoCountryByRegion(code) {
  return ARRIVO_COUNTRY_CODES.find(function (c) { return c.code === code; }) || null;
}

// The main country for a calling code (e.g. +7 is Russia, not Kazakhstan, +44 is
// the United Kingdom). Used when the number alone cannot tell countries apart.
function arrivoCountryByDial(dial) {
  return ARRIVO_COUNTRY_CODES.find(function (c) { return c.dial === dial && c.main; }) || null;
}

// Accepts a region code ("NG") or, for older callers, a calling code ("+234").
function arrivoResolveCountry(dialOrRegion) {
  return arrivoCountryByRegion(dialOrRegion) || arrivoCountryByDial(dialOrRegion);
}

function arrivoGuessRegion() {
  try {
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    var m = tz && ARRIVO_TZ_REGION.match(new RegExp("(?:^|;)" + tz.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&") + "=([A-Z]{2})"));
    if (m && arrivoCountryByRegion(m[1])) return m[1];
  } catch (e) {}
  // The browser language is deliberately not used: many Nigerians have phones
  // set to US English, which would wrongly give +1.
  return "NG";
}

// For a +1 number, work out the country from the area code.
function arrivoRegionForNanp(rest) {
  var npa = String(rest || "").replace(/\D/g, "").slice(0, 3);
  if (npa.length === 3 && ARRIVO_AREA_TO_REGION[npa]) return ARRIVO_AREA_TO_REGION[npa];
  return "US";
}

// If the text starts with +, 00, or is a bare Nigerian 234... number, work out
// which country it belongs to. Returns { code, dial, rest } with rest as digits,
// or null when nothing can be detected (so ordinary typing is left alone).
function arrivoDetectCountry(raw) {
  var s = String(raw || "").replace(/[\s\-().]/g, "");
  var digits = null;
  if (s.charAt(0) === "+") digits = s.slice(1);
  else if (s.slice(0, 2) === "00") digits = s.slice(2);
  else if (/^234\d{10,11}$/.test(s)) digits = s;
  if (digits === null) return null;
  digits = digits.replace(/\D/g, "");
  var bestLen = 0;
  ARRIVO_COUNTRY_CODES.forEach(function (c) {
    var d = c.dial.slice(1);
    if (digits.indexOf(d) === 0 && d.length > bestLen) bestLen = d.length;
  });
  if (!bestLen) return null;
  var dial = "+" + digits.slice(0, bestLen);
  var rest = digits.slice(bestLen);
  var country = dial === "+1" ? arrivoCountryByRegion(arrivoRegionForNanp(rest)) : arrivoCountryByDial(dial);
  if (!country) return null;
  return { code: country.code, dial: country.dial, rest: rest };
}

function arrivoValidatePhone(dialOrRegion, nationalNumber) {
  var digitsOnly = (nationalNumber || "").replace(/\D/g, "");
  var country = arrivoResolveCountry(dialOrRegion);
  if (!country) return { valid: false, message: "Please choose a country code." };
  if (!digitsOnly) return { valid: false, message: "Please enter a phone number." };
  // Someone typed the country code into the number box as well.
  var dialDigits = country.dial.slice(1);
  if (digitsOnly.length > country.maxLen && digitsOnly.indexOf(dialDigits) === 0) {
    digitsOnly = digitsOnly.slice(dialDigits.length);
  }
  // Local format starts with a trunk 0 (0803...). Drop it, the country code replaces it.
  if (digitsOnly.charAt(0) === "0") digitsOnly = digitsOnly.slice(1);
  if (digitsOnly.length < country.minLen || digitsOnly.length > country.maxLen) {
    return {
      valid: false,
      message: country.minLen === country.maxLen
        ? `A ${country.name} number should have ${country.minLen} digits after the country code.`
        : `A ${country.name} number should have ${country.minLen}-${country.maxLen} digits after the country code.`,
    };
  }
  return { valid: true, full: country.dial + digitsOnly, country: country.code };
}

// Renders a country <select> + number <input> pair into a container element,
// and returns a getter for the combined, validated value.
// The country is picked automatically: from the visitor's time zone before they
// type, and from the number itself as they type or paste (+234..., 00233...,
// +1 416... for Canada).
function arrivoBuildPhoneInput(containerEl, options) {
  options = options || {};
  var start = options.defaultRegion ||
    (options.defaultDial && (arrivoCountryByDial(options.defaultDial) || {}).code) ||
    arrivoGuessRegion();

  containerEl.innerHTML =
    '<div style="display:flex; gap:8px;">' +
    '<select class="field arrivo-phone-country" aria-label="Country code" style="flex:0 0 118px; padding-left:8px; padding-right:4px;"></select>' +
    '<input type="tel" class="field arrivo-phone-number" style="flex:1;" autocomplete="tel-national" inputmode="tel" placeholder="' + (options.placeholder || "Phone number") + '">' +
    "</div>";

  var select = containerEl.querySelector(".arrivo-phone-country");
  var input = containerEl.querySelector(".arrivo-phone-number");

  function addOption(parent, c) {
    var opt = document.createElement("option");
    opt.value = c.code;
    opt.textContent = c.code + " " + c.dial;
    opt.title = c.name + " " + c.dial;
    if (c.code === start) opt.selected = true;
    parent.appendChild(opt);
  }
  var common = document.createElement("optgroup");
  common.label = "Common";
  ARRIVO_COUNTRY_CODES.slice(0, ARRIVO_PRIORITY_COUNT).forEach(function (c) { addOption(common, c); });
  var all = document.createElement("optgroup");
  all.label = "All countries";
  ARRIVO_COUNTRY_CODES.slice(ARRIVO_PRIORITY_COUNT).forEach(function (c) { addOption(all, c); });
  select.appendChild(common);
  select.appendChild(all);
  select.value = start;

  // Auto-detect the country as the number is typed or pasted. "autoPicked" stays
  // true until the person chooses a country themselves, so we never override that.
  var autoPicked = true;
  select.addEventListener("change", function () { autoPicked = false; });

  input.addEventListener("input", function () {
    var hit = arrivoDetectCountry(input.value);
    if (hit) {
      select.value = hit.code;
      autoPicked = true;
      input.value = hit.rest.replace(/^0/, "");
      hit = null;
    }
    // +1 is shared: keep the label right as the area code is typed (416 = Canada).
    var cur = arrivoCountryByRegion(select.value);
    if (autoPicked && cur && cur.dial === "+1") {
      var region = arrivoRegionForNanp(input.value);
      if (region !== select.value) select.value = region;
    }
  });

  return {
    getValue: function () {
      // A leading + or 00 that did not match any known country code: say so,
      // rather than treating the digits as a number for the selected country.
      if (/^\s*(\+|00)/.test(input.value)) {
        return { valid: false, message: "That country code isn't recognised. Pick your country from the list and enter the number without it." };
      }
      return arrivoValidatePhone(select.value, input.value);
    },
    // Old callers pass a calling code ("+234"); a region code ("NG") also works.
    setRaw: function (dialOrRegion, number) {
      var c = arrivoResolveCountry(dialOrRegion);
      if (c) select.value = c.code;
      input.value = number;
    },
  };
}
