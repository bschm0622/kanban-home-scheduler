export interface NavLink {
    label: string;
    href: string;
    external?: boolean;
}

export interface SiteConfiguration {
    title: string;
    name: string;
    description: string;
    href: string;
    author: string;
    locale: string;

    keywords?: string[];
    ogImage?: string;
    twitterHandle?: string;

    themeColor?: string;
    backgroundColor?: string;

    email?: string;
    phone?: string;
    address?: string;

    socials?: {
        twitter?: string;
        github?: string;
        linkedin?: string;
        youtube?: string;
        [key: string]: string | undefined;
    };

    nav: NavLink[];
    footerNav?: NavLink[];

    copyright?: string;
}

export const SITE: SiteConfiguration = {
    title: "Home Organizer",
    name: "Home Organizer",
    description: "Mobile kanban board for home organization and task management.",
    href: "http://localhost:4321",
    author: "Becky Schmidt",
    locale: "en-US",

    nav: [
        { label: "Board", href: "/" },
    ],

    copyright: `© 2024 Home Organizer. All rights reserved.`,
};
