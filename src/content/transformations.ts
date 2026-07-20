export type Transformation = {
  id: string;
  src: string;
  alt: string;
  /** First name derived from the published gallery filename when available. */
  clientName?: string;
  /** Optional extra images shown in the same card (e.g. front + back). */
  additionalImages?: string[];
};

/**
 * Client transformation gallery sourced from
 * https://ma5performance.com/transformations
 *
 * Images are published on the current MA5 site without captions or quotes.
 * Client names below come from the published asset filenames only.
 */
export const transformations: Transformation[] = [
  {
    id: "kathy",
    src: "/images/transformations/kathy-front.png",
    additionalImages: ["/images/transformations/kathy-back.png"],
    alt: "Kathy front and back transformation at MA5 Performance",
    clientName: "Kathy",
  },
  {
    id: "jake",
    src: "/images/transformations/jake.png",
    alt: "Jake transformation at MA5 Performance",
    clientName: "Jake",
  },
  {
    id: "erin",
    src: "/images/transformations/Erin.JPG",
    alt: "Erin transformation at MA5 Performance",
    clientName: "Erin",
  },
  {
    id: "jennifer",
    src: "/images/transformations/Jennifer.jpg",
    alt: "Jennifer transformation at MA5 Performance",
    clientName: "Jennifer",
  },
  {
    id: "michelle",
    src: "/images/transformations/Michelle.jpg",
    alt: "Michelle transformation at MA5 Performance",
    clientName: "Michelle",
  },
  {
    id: "sara",
    src: "/images/transformations/Sara.JPG",
    alt: "Sara transformation at MA5 Performance",
    clientName: "Sara",
  },
  {
    id: "img-7184",
    src: "/images/transformations/IMG_7184.jpeg",
    alt: "Client transformation at MA5 Performance",
  },
  {
    id: "img-7164",
    src: "/images/transformations/IMG_7164.jpg",
    alt: "Client transformation at MA5 Performance",
  },
  {
    id: "img-7180",
    src: "/images/transformations/IMG_7180.jpg",
    alt: "Client transformation at MA5 Performance",
  },
  {
    id: "img-7181",
    src: "/images/transformations/IMG_7181.jpg",
    alt: "Client transformation at MA5 Performance",
  },
  {
    id: "img-7183",
    src: "/images/transformations/IMG_7183.jpg",
    alt: "Client transformation at MA5 Performance",
  },
  {
    id: "tony",
    src: "/images/transformations/tony.jpeg",
    alt: "Tony transformation at MA5 Performance",
    clientName: "Tony",
  },
  {
    id: "alyssa",
    src: "/images/transformations/Alyssa.jpeg",
    alt: "Alyssa transformation at MA5 Performance",
    clientName: "Alyssa",
  },
  {
    id: "becca",
    src: "/images/transformations/Becca.jpeg",
    alt: "Becca transformation at MA5 Performance",
    clientName: "Becca",
  },
  {
    id: "krystal",
    src: "/images/transformations/Krystal.jpeg",
    alt: "Krystal transformation at MA5 Performance",
    clientName: "Krystal",
  },
  {
    id: "lindsey",
    src: "/images/transformations/Lindsey.jpeg",
    alt: "Lindsey transformation at MA5 Performance",
    clientName: "Lindsey",
  },
  {
    id: "brooke",
    src: "/images/transformations/Brooke.jpeg",
    alt: "Brooke transformation at MA5 Performance",
    clientName: "Brooke",
  },
  {
    id: "alex",
    src: "/images/transformations/Alex.jpg",
    alt: "Alex transformation at MA5 Performance",
    clientName: "Alex",
  },
  {
    id: "kristine",
    src: "/images/transformations/Kristine.jpeg",
    alt: "Kristine transformation at MA5 Performance",
    clientName: "Kristine",
  },
  {
    id: "laura",
    src: "/images/transformations/Laura.jpeg",
    alt: "Laura transformation at MA5 Performance",
    clientName: "Laura",
  },
  {
    id: "lizzy",
    src: "/images/transformations/Lizzy.jpg",
    alt: "Lizzy transformation at MA5 Performance",
    clientName: "Lizzy",
  },
  {
    id: "mecca",
    src: "/images/transformations/MEcca.jpeg",
    alt: "Mecca transformation at MA5 Performance",
    clientName: "Mecca",
  },
  {
    id: "tonya",
    src: "/images/transformations/Tonya.jpeg",
    alt: "Tonya transformation at MA5 Performance",
    clientName: "Tonya",
  },
];

export const featuredTransformations = [
  ...transformations.filter((item) => item.id === "kathy" || item.id === "jake"),
  ...transformations.filter(
    (item) =>
      Boolean(item.clientName) && item.id !== "kathy" && item.id !== "jake",
  ).slice(0, 4),
];
