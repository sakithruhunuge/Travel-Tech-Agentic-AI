export interface DestinationPhoto {
  title: string;
  imageUrl: string;
  imageCredit: string;
  source: string;
}

export interface PackagePhoto {
  coverUrl: string;
  gallery: string[];
  caption: string;
}

export const sriLankaImages = {
  hero: {
    title: "Misty Tea Estates of Nuwara Eliya",
    imageUrl: "/images/hero_bg.png",
    imageCredit: "Generated Local Asset",
    source: "Local",
  },
  destinations: [
    {
      title: "Sigiriya Rock Fortress",
      imageUrl: "/images/sigiriya.png",
      imageCredit: "Generated Local Asset",
      source: "Local",
    },
    {
      title: "Dambulla Cave Temple",
      imageUrl: "/images/dambulla.png",
      imageCredit: "Generated Local Asset",
      source: "Local",
    },
    {
      title: "Temple of the Tooth in Kandy",
      imageUrl: "/images/kandy.png",
      imageCredit: "Generated Local Asset",
      source: "Local",
    },
    {
      title: "Nuwara Eliya Tea Plantations",
      imageUrl: "/images/tea.png",
      imageCredit: "Generated Local Asset",
      source: "Local",
    },
    {
      title: "Nine Arches Bridge, Ella",
      imageUrl: "/images/nine_arch.png",
      imageCredit: "Generated Local Asset",
      source: "Local",
    },
    {
      title: "Yala National Park Safari",
      imageUrl: "/images/yala.png",
      imageCredit: "Generated Local Asset",
      source: "Local",
    },
    {
      title: "Mirissa Beach",
      imageUrl: "/images/mirissa.png",
      imageCredit: "Generated Local Asset",
      source: "Local",
    },
    {
      title: "Galle Fort",
      imageUrl: "/images/galle.png",
      imageCredit: "Generated Local Asset",
      source: "Local",
    },
    {
      title: "Bentota Beach",
      imageUrl: "/images/bentota.png",
      imageCredit: "Generated Local Asset",
      source: "Local",
    },
    {
      title: "Colombo Skyline",
      imageUrl: "/images/colombo.png",
      imageCredit: "Generated Local Asset",
      source: "Local",
    },
  ] as DestinationPhoto[],
  packages: {
    culturalTriangle: {
      coverUrl: "/images/sigiriya.png",
      gallery: [
        "/images/dambulla.png",
        "/images/kandy.png",
      ],
      caption: "Explore ancient cities, temples, and rock fortresses.",
    },
    southernBeach: {
      coverUrl: "/images/mirissa.png",
      gallery: [
        "/images/galle.png",
        "/images/bentota.png",
      ],
      caption: "Relax on golden sand shores and watch coastal marine life.",
    },
    hillCountry: {
      coverUrl: "/images/nine_arch.png",
      gallery: [
        "/images/tea.png",
      ],
      caption: "Travel by train through emerald hills and misty tea valleys.",
    },
    wildlifeSafari: {
      coverUrl: "/images/yala.png",
      gallery: [],
      caption: "Encounter leopards, elephants, and rare bird species.",
    },
    grandTour: {
      coverUrl: "/images/colombo.png",
      gallery: [
        "/images/sigiriya.png",
        "/images/nine_arch.png",
        "/images/galle.png",
      ],
      caption: "The ultimate 10-day loop of the entire island paradise.",
    },
  } as Record<string, PackagePhoto>,
  testimonials: {
    ellaTrain: "/images/nine_arch.png",
    sigiriyaHike: "/images/sigiriya.png",
    southernBeaches: "/images/mirissa.png",
    yalaSafari: "/images/yala.png",
  },
};
