export interface CountryCodeItem {
  name: string;
  dialCode: string;
  code: string; // ISO 2-letter
  flag: string;
}

export const COUNTRY_CODES: CountryCodeItem[] = [
  { name: "Spain", dialCode: "+34", code: "ES", flag: "🇪🇸" },
  { name: "United Kingdom", dialCode: "+44", code: "GB", flag: "🇬🇧" },
  { name: "United States", dialCode: "+1", code: "US", flag: "🇺🇸" },
  { name: "France", dialCode: "+33", code: "FR", flag: "🇫🇷" },
  { name: "Germany", dialCode: "+49", code: "DE", flag: "🇩🇪" },
  { name: "Italy", dialCode: "+39", code: "IT", flag: "🇮🇹" },
  { name: "Portugal", dialCode: "+351", code: "PT", flag: "🇵🇹" },
  { name: "Netherlands", dialCode: "+31", code: "NL", flag: "🇳🇱" },
  { name: "Belgium", dialCode: "+32", code: "BE", flag: "🇧🇪" },
  { name: "Switzerland", dialCode: "+41", code: "CH", flag: "🇨🇭" },
  { name: "Austria", dialCode: "+43", code: "AT", flag: "🇦🇹" },
  { name: "Sweden", dialCode: "+46", code: "SE", flag: "🇸🇪" },
  { name: "Norway", dialCode: "+47", code: "NO", flag: "🇳🇴" },
  { name: "Denmark", dialCode: "+45", code: "DK", flag: "🇩🇰" },
  { name: "Finland", dialCode: "+358", code: "FI", flag: "🇫🇮" },
  { name: "Ireland", dialCode: "+353", code: "IE", flag: "🇮🇪" },
  { name: "Poland", dialCode: "+48", code: "PL", flag: "🇵🇱" },
  { name: "Czech Republic", dialCode: "+420", code: "CZ", flag: "🇨🇿" },
  { name: "Greece", dialCode: "+30", code: "GR", flag: "🇬🇷" },
  { name: "Romania", dialCode: "+40", code: "RO", flag: "🇷🇴" },
  { name: "Hungary", dialCode: "+36", code: "HU", flag: "🇭🇺" },
  { name: "Bulgaria", dialCode: "+359", code: "BG", flag: "🇧🇬" },
  { name: "Croatia", dialCode: "+385", code: "HR", flag: "🇭🇷" },
  { name: "Slovakia", dialCode: "+421", code: "SK", flag: "🇸🇰" },
  { name: "Slovenia", dialCode: "+386", code: "SI", flag: "🇸🇮" },
  { name: "Estonia", dialCode: "+372", code: "EE", flag: "🇪🇪" },
  { name: "Latvia", dialCode: "+371", code: "LV", flag: "🇱🇻" },
  { name: "Lithuania", dialCode: "+370", code: "LT", flag: "🇱🇹" },
  { name: "Cyprus", dialCode: "+357", code: "CY", flag: "🇨🇾" },
  { name: "Malta", dialCode: "+356", code: "MT", flag: "🇲🇹" },
  { name: "Luxembourg", dialCode: "+352", code: "LU", flag: "🇱🇺" },
  { name: "Iceland", dialCode: "+354", code: "IS", flag: "🇮🇸" },
  { name: "Andorra", dialCode: "+376", code: "AD", flag: "🇦🇩" },
  { name: "Monaco", dialCode: "+377", code: "MC", flag: "🇲🇨" },
  { name: "Liechtenstein", dialCode: "+423", code: "LI", flag: "🇱🇮" },
  { name: "San Marino", dialCode: "+378", code: "SM", flag: "🇸🇲" },
  { name: "Gibraltar", dialCode: "+350", code: "GI", flag: "🇬🇮" },
  { name: "Canada", dialCode: "+1", code: "CA", flag: "🇨🇦" },
  { name: "Mexico", dialCode: "+52", code: "MX", flag: "🇲🇽" },
  { name: "Argentina", dialCode: "+54", code: "AR", flag: "🇦🇷" },
  { name: "Brazil", dialCode: "+55", code: "BR", flag: "🇧🇷" },
  { name: "Chile", dialCode: "+56", code: "CL", flag: "🇨🇱" },
  { name: "Colombia", dialCode: "+57", code: "CO", flag: "🇨🇴" },
  { name: "Peru", dialCode: "+51", code: "PE", flag: "🇵🇪" },
  { name: "Uruguay", dialCode: "+598", code: "UY", flag: "🇺🇾" },
  { name: "Paraguay", dialCode: "+595", code: "PY", flag: "🇵🇾" },
  { name: "Ecuador", dialCode: "+593", code: "EC", flag: "🇪🇨" },
  { name: "Bolivia", dialCode: "+591", code: "BO", flag: "🇧🇴" },
  { name: "Venezuela", dialCode: "+58", code: "VE", flag: "🇻🇪" },
  { name: "Costa Rica", dialCode: "+506", code: "CR", flag: "🇨🇷" },
  { name: "Panama", dialCode: "+507", code: "PA", flag: "🇵🇦" },
  { name: "Dominican Republic", dialCode: "+1809", code: "DO", flag: "🇩🇴" },
  { name: "Puerto Rico", dialCode: "+1787", code: "PR", flag: "🇵🇷" },
  { name: "Guatemala", dialCode: "+502", code: "GT", flag: "🇬🇹" },
  { name: "Cuba", dialCode: "+53", code: "CU", flag: "🇨🇺" },
  { name: "Australia", dialCode: "+61", code: "AU", flag: "🇦🇺" },
  { name: "New Zealand", dialCode: "+64", code: "NZ", flag: "🇳🇿" },
  { name: "Japan", dialCode: "+81", code: "JP", flag: "🇯🇵" },
  { name: "South Korea", dialCode: "+82", code: "KR", flag: "🇰🇷" },
  { name: "China", dialCode: "+86", code: "CN", flag: "🇨🇳" },
  { name: "Hong Kong", dialCode: "+852", code: "HK", flag: "🇭🇰" },
  { name: "Taiwan", dialCode: "+886", code: "TW", flag: "🇹🇼" },
  { name: "Singapore", dialCode: "+65", code: "SG", flag: "🇸🇬" },
  { name: "United Arab Emirates", dialCode: "+971", code: "AE", flag: "🇦🇪" },
  { name: "Saudi Arabia", dialCode: "+966", code: "SA", flag: "🇸🇦" },
  { name: "Qatar", dialCode: "+974", code: "QA", flag: "🇶🇦" },
  { name: "Kuwait", dialCode: "+965", code: "KW", flag: "🇰🇼" },
  { name: "Bahrain", dialCode: "+973", code: "BH", flag: "🇧🇭" },
  { name: "Oman", dialCode: "+968", code: "OM", flag: "🇴🇲" },
  { name: "Israel", dialCode: "+972", code: "IL", flag: "🇮🇱" },
  { name: "Turkey", dialCode: "+90", code: "TR", flag: "🇹🇷" },
  { name: "South Africa", dialCode: "+27", code: "ZA", flag: "🇿🇦" },
  { name: "Morocco", dialCode: "+212", code: "MA", flag: "🇲🇦" },
  { name: "Algeria", dialCode: "+213", code: "DZ", flag: "🇩🇿" },
  { name: "Tunisia", dialCode: "+216", code: "TN", flag: "🇹🇳" },
  { name: "Egypt", dialCode: "+20", code: "EG", flag: "🇪🇬" },
  { name: "Nigeria", dialCode: "+234", code: "NG", flag: "🇳🇬" },
  { name: "Kenya", dialCode: "+254", code: "KE", flag: "🇰🇪" },
  { name: "Ghana", dialCode: "+233", code: "GH", flag: "🇬🇭" },
  { name: "Senegal", dialCode: "+221", code: "SN", flag: "🇸🇳" },
  { name: "India", dialCode: "+91", code: "IN", flag: "🇮🇳" },
  { name: "Pakistan", dialCode: "+92", code: "PK", flag: "🇵🇰" },
  { name: "Bangladesh", dialCode: "+880", code: "BD", flag: "🇧🇩" },
  { name: "Sri Lanka", dialCode: "+94", code: "LK", flag: "🇱🇰" },
  { name: "Philippines", dialCode: "+63", code: "PH", flag: "🇵🇭" },
  { name: "Thailand", dialCode: "+66", code: "TH", flag: "🇹🇭" },
  { name: "Vietnam", dialCode: "+84", code: "VN", flag: "🇻🇳" },
  { name: "Malaysia", dialCode: "+60", code: "MY", flag: "🇲🇾" },
  { name: "Indonesia", dialCode: "+62", code: "ID", flag: "🇮🇩" },
  { name: "Ukraine", dialCode: "+380", code: "UA", flag: "🇺🇦" },
  { name: "Serbia", dialCode: "+381", code: "RS", flag: "🇷🇸" },
  { name: "Bosnia and Herzegovina", dialCode: "+387", code: "BA", flag: "🇧🇦" },
  { name: "Albania", dialCode: "+355", code: "AL", flag: "🇦🇱" },
  { name: "Montenegro", dialCode: "+382", code: "ME", flag: "🇲🇪" },
  { name: "North Macedonia", dialCode: "+389", code: "MK", flag: "🇲🇰" },
  { name: "Georgia", dialCode: "+995", code: "GE", flag: "🇬🇪" },
  { name: "Armenia", dialCode: "+374", code: "AM", flag: "🇦🇲" },
  { name: "Azerbaijan", dialCode: "+994", code: "AZ", flag: "🇦🇿" },
  { name: "Kazakhstan", dialCode: "+7", code: "KZ", flag: "🇰🇿" },
  { name: "Lebanon", dialCode: "+961", code: "LB", flag: "🇱🇧" },
  { name: "Jordan", dialCode: "+962", code: "JO", flag: "🇯🇴" },
];

/**
 * Split a full phone string into a matched CountryCodeItem and the remaining national number.
 */
export function parsePhoneNumber(raw: string): { country: CountryCodeItem; nationalNumber: string } {
  const defaultCountry = COUNTRY_CODES[0]; // Spain (+34)
  if (!raw) {
    return { country: defaultCountry, nationalNumber: "" };
  }

  const cleaned = raw.trim();

  // If starts with +, try matching the longest dialCode first
  if (cleaned.startsWith("+")) {
    const sortedCountries = [...COUNTRY_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    for (const c of sortedCountries) {
      if (cleaned.startsWith(c.dialCode)) {
        const remaining = cleaned.slice(c.dialCode.length).trim();
        return { country: c, nationalNumber: remaining };
      }
    }
  }

  // Fallback: If no country dial code prefix matched, assume default country
  return { country: defaultCountry, nationalNumber: cleaned.replace(/^\+34\s*/, "") };
}
