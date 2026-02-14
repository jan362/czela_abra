export interface NavSection {
  id: string;
  /** Czech label for display */
  labelCs: string;
  /** English label */
  label: string;
  /** Path to the module page */
  href: string;
  /** Short description */
  description: string;
  /** SVG icon name or emoji */
  icon: string;
  /** Submenu items (optional) */
  submenu?: NavSection[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "matching",
    labelCs: "Párování plateb",
    label: "Payment Matching",
    href: "/matching",
    description: "Spárování bankovních plateb s fakturami",
    icon: "🔗",
  },
  {
    id: "customer-balance",
    labelCs: "Saldo odběratelů",
    label: "Customer Balance",
    href: "/customer-balance",
    description: "Přehled sald plateb a faktur odběratelů",
    icon: "💰",
  },
  {
    id: "more",
    labelCs: "Další akce",
    label: "More Actions",
    href: "#",
    description: "Další moduly a funkce",
    icon: "⚙️",
    submenu: [
      {
        id: "invoicing",
        labelCs: "Fakturace",
        label: "Invoicing",
        href: "/invoices",
        description: "Vydané a přijaté faktury",
        icon: "📄",
      },
      {
        id: "banking",
        labelCs: "Banka",
        label: "Banking",
        href: "/bank",
        description: "Bankovní transakce a výpisy",
        icon: "🏦",
      },
      {
        id: "cash",
        labelCs: "Pokladna",
        label: "Cash Register",
        href: "/cash",
        description: "Pokladní pohyby",
        icon: "💵",
      },
      {
        id: "contacts",
        labelCs: "Adresář",
        label: "Contacts",
        href: "/contacts",
        description: "Firmy a kontakty",
        icon: "👥",
      },
      {
        id: "warehouse",
        labelCs: "Sklad",
        label: "Warehouse",
        href: "/warehouse",
        description: "Sklady a skladové karty",
        icon: "📦",
      },
      {
        id: "orders",
        labelCs: "Objednávky",
        label: "Orders",
        href: "/orders",
        description: "Přijaté a vydané objednávky",
        icon: "🛒",
      },
      {
        id: "pricelist",
        labelCs: "Ceník",
        label: "Price List",
        href: "/pricelist",
        description: "Produkty a ceny",
        icon: "🏷️",
      },
    ],
  },
];
