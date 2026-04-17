export const chipColors = [
  { bg: "bg-[#5D00FF]/10", text: "text-[#5D00FF]", border: "border-[#5D00FF]", hoverBorder: "hover:border-[#5D00FF]", solidBg: "bg-[#5D00FF]", solidText: "text-white" }, // Primary Purple
  { bg: "bg-[#00FFCC]/10", text: "text-[#00FFCC]", border: "border-[#00FFCC]", hoverBorder: "hover:border-[#00FFCC]", solidBg: "bg-[#00FFCC]", solidText: "text-black" }, // Neon Blue
  { bg: "bg-[#FF00CC]/10", text: "text-[#FF00CC]", border: "border-[#FF00CC]", hoverBorder: "hover:border-[#FF00CC]", solidBg: "bg-[#FF00CC]", solidText: "text-white" }, // Neon Pink
  { bg: "bg-[#FF3366]/10", text: "text-[#FF3366]", border: "border-[#FF3366]", hoverBorder: "hover:border-[#FF3366]", solidBg: "bg-[#FF3366]", solidText: "text-white" }, // Neon Red
  { bg: "bg-[#33CCFF]/10", text: "text-[#33CCFF]", border: "border-[#33CCFF]", hoverBorder: "hover:border-[#33CCFF]", solidBg: "bg-[#33CCFF]", solidText: "text-black" }, // Neon Cyan
  { bg: "bg-[#FF9900]/10", text: "text-[#FF9900]", border: "border-[#FF9900]", hoverBorder: "hover:border-[#FF9900]", solidBg: "bg-[#FF9900]", solidText: "text-black" }, // Neon Orange
  { bg: "bg-[#5D00FF]/10", text: "text-[#5D00FF]", border: "border-[#5D00FF]", hoverBorder: "hover:border-[#5D00FF]", solidBg: "bg-[#5D00FF]", solidText: "text-white" }  // Primary Purple
];

export const platformColors: Record<string, any> = {
  spotify: { bg: "bg-[#1DB954]/10", text: "text-[#1DB954]", border: "border-[#1DB954]", hoverBorder: "hover:border-[#1DB954]", solidBg: "bg-[#1DB954]", solidText: "text-white" },
  youtube: { bg: "bg-[#FF0000]/10", text: "text-[#FF0000]", border: "border-[#FF0000]", hoverBorder: "hover:border-[#FF0000]", solidBg: "bg-[#FF0000]", solidText: "text-white" },
  bandcamp: { bg: "bg-[#629AA9]/10", text: "text-[#629AA9]", border: "border-[#629AA9]", hoverBorder: "hover:border-[#629AA9]", solidBg: "bg-[#629AA9]", solidText: "text-white" },
  soundcloud: { bg: "bg-[#FF5500]/10", text: "text-[#FF5500]", border: "border-[#FF5500]", hoverBorder: "hover:border-[#FF5500]", solidBg: "bg-[#FF5500]", solidText: "text-white" },
  all: { bg: "bg-[#5D00FF]/10", text: "text-[#5D00FF]", border: "border-[#5D00FF]", hoverBorder: "hover:border-[#5D00FF]", solidBg: "bg-[#5D00FF]", solidText: "text-white" },
  dices: { bg: "bg-[#5D00FF]/10", text: "text-[#5D00FF]", border: "border-[#5D00FF]", hoverBorder: "hover:border-[#5D00FF]", solidBg: "bg-[#5D00FF]", solidText: "text-white" }
};

export const getChipColor = (text: string) => {
  if (!text) return chipColors[0];
  const lowerText = text.toLowerCase();
  
  if (platformColors[lowerText]) {
    return platformColors[lowerText];
  }

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % chipColors.length;
  return chipColors[index];
};
