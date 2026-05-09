// TODO: replace with final association name
export const siteName = 'VMV SA';
export const siteDescription =
  'Building schools in rural Sri Lanka — one community at a time.';

export const images = {
  heroMain: '/images/field/PLACEHOLDER_hero-main.jpg',
  heroAlt: 'Children in a bright classroom in rural Sri Lanka',
  projectCover: '/images/field/PLACEHOLDER_project-cover.jpg',
  projectCoverAlt: 'Construction of a new school building',
  storyAmalka: '/images/field/PLACEHOLDER_story-amalka.jpg',
  storyAmalkaAlt: 'Amalka standing in front of her school',
  storyNuwan: '/images/field/PLACEHOLDER_story-nuwan.jpg',
  storyNuwanAlt: 'Nuwan reading at his desk',
  aboutTeam: '/images/field/PLACEHOLDER_about-team.jpg',
  aboutTeamAlt: 'VMV SA team members at the building site',
  teamMember1: '/images/field/PLACEHOLDER_team-member-1.jpg',
  teamMember1Alt: 'Portrait of team member',
  teamMember2: '/images/field/PLACEHOLDER_team-member-2.jpg',
  teamMember2Alt: 'Portrait of team member',
  logoMain: '/images/logos/vmv-sa-logo.svg',
  logoAlt: 'VMV SA logo',
  twintQr: '/images/PLACEHOLDER_twint-qr.svg',
  twintQrAlt: 'Twint QR code for donations',
} as const;

export const nav = {
  home: 'Home',
  about: 'About',
  projects: 'Projects',
  stories: 'Stories',
  volunteer: 'Volunteer',
  contact: 'Contact',
  donate: 'Donate',
};

export const footer = {
  tagline: 'Building schools. Changing futures.',
  copyright: `© ${new Date().getFullYear()} VMV SA. All rights reserved.`, // TODO: replace with final association name
  links: {
    privacy: 'Privacy',
    contact: 'Contact',
    financials: 'Financials',
  },
};

export const home = {
  hero: {
    headline: 'Every child deserves a place to learn.',
    subheadline:
      'VMV SA builds schools in rural Sri Lanka, giving children a safe space to grow, learn, and thrive.', // TODO: replace with final association name
    ctaDonate: 'Donate Now',
    ctaLearnMore: 'Learn More',
  },
  impact: {
    heading: 'Our Impact So Far',
    schools: { value: '[3]', label: 'Schools Built' },
    children: { value: '[450]', label: 'Children Reached' },
    volunteers: { value: '[28]', label: 'Volunteers Involved' },
  },
  currentProject: {
    heading: 'Current Project',
    linkLabel: 'Follow the Project',
  },
  storyReel: {
    heading: 'Stories of Change',
    linkLabel: 'Read All Stories',
  },
  programs: {
    heading: 'How We Work',
    build: {
      title: 'Build',
      body: 'In Progress…',
    },
    educate: {
      title: 'Educate',
      body: 'In Progress…',
    },
    sustain: {
      title: 'Sustain',
      body: 'In Progress…',
    },
  },
  partners: {
    heading: 'Our Partners',
  },
  newsletter: {
    heading: 'Stay Informed',
    subheading: 'Receive field updates, project news, and stories from Sri Lanka.',
    placeholder: 'Your email address',
    cta: 'Subscribe',
    disclaimer: 'No spam. Unsubscribe at any time.',
  },
};

export const about = {
  meta: {
    title: `About — ${siteName}`,
    description: 'Learn about our mission, our origin, and the team behind VMV SA.',
  },
  hero: {
    heading: 'About Us',
    subheading: 'In Progress…',
  },
  mission: {
    heading: 'Our Mission',
    body: 'In Progress…',
  },
  origin: {
    heading: 'Our Story',
    body: 'In Progress…',
  },
  team: {
    heading: 'The Team',
    members: [
      {
        name: 'In Progress…',
        role: 'In Progress…',
        bio: 'In Progress…',
        image: images.teamMember1,
        imageAlt: images.teamMember1Alt,
      },
      {
        name: 'In Progress…',
        role: 'In Progress…',
        bio: 'In Progress…',
        image: images.teamMember2,
        imageAlt: images.teamMember2Alt,
      },
    ],
  },
  financials: {
    heading: 'Financial Transparency',
    body: 'We publish our annual financial report every year. Transparency is a core value.',
    linkLabel: 'Download Annual Report (PDF)',
    linkHref: '#', // TODO: replace with real PDF link
  },
};

export const projects = {
  meta: {
    title: `Projects — ${siteName}`,
    description: 'All school building projects by VMV SA in rural Sri Lanka.',
  },
  heading: 'Our Projects',
  subheading: 'From the first stone to the last classroom — every project documented.',
  statusLabels: {
    planned: 'Planned',
    'in-progress': 'In Progress',
    completed: 'Completed',
  },
};

export const stories = {
  meta: {
    title: `Stories — ${siteName}`,
    description: 'Real stories from the children and communities we serve in Sri Lanka.',
  },
  heading: 'Stories of Change',
  subheading: 'Behind every school is a child whose life is different because of it.',
};

export const volunteer = {
  meta: {
    title: `Volunteer — ${siteName}`,
    description: 'Join VMV SA as a volunteer and help build schools in Sri Lanka.',
  },
  hero: {
    heading: 'Volunteer With Us',
    subheading: 'In Progress…',
  },
  info: {
    heading: 'What to Expect',
    body: 'In Progress…',
  },
  form: {
    heading: 'Apply to Volunteer',
    fields: {
      name: 'Full Name',
      email: 'Email Address',
      availability: 'Availability',
      message: 'Tell us about yourself',
    },
    submit: 'Submit Application',
    disclaimer: 'We will get back to you within 5 business days.',
  },
};

export const donate = {
  meta: {
    title: `Donate — ${siteName}`,
    description: 'Support VMV SA — donate to build schools in rural Sri Lanka.',
  },
  hero: {
    heading: 'Support Our Work',
    subheading: 'Your donation directly funds school construction in rural Sri Lanka.',
  },
  form: {
    amountHeading: 'Choose an Amount',
    tiers: ['20', '50', '100', '200'],
    customPlaceholder: 'Custom amount',
    frequencyOnce: 'Give Once',
    frequencyMonthly: 'Give Monthly',
    currencies: ['CHF', 'EUR', 'USD'],
    defaultCurrency: 'CHF',
    submitLabel: 'Proceed to Payment',
    disclaimer: 'You will be redirected to our secure payment page.',
  },
  wire: {
    heading: 'Bank Transfer',
    iban: '[IBAN — In Progress]', // TODO: replace with real IBAN once bank account is open
    beneficiary: 'VMV SA', // TODO: replace with final association name
    bank: '[Bank Name — In Progress]',
    reference: 'Please include your name and year as payment reference (e.g. Smith 2026).',
  },
  twint: {
    heading: 'Pay with Twint',
    instruction: 'Scan the QR code with your Twint app.',
  },
  taxReceipt: {
    heading: 'Tax Receipt',
    body: 'A tax receipt is issued automatically for donations of CHF 100 or more. Sent to your email within 5 business days.',
  },
};

export const contact = {
  meta: {
    title: `Contact — ${siteName}`,
    description: 'Get in touch with VMV SA — for press, partnership, or general enquiries.',
  },
  hero: {
    heading: 'Get in Touch',
    subheading: 'For press, partnership enquiries, or questions about our work.',
  },
  form: {
    heading: 'Send a Message',
    fields: {
      organisation: 'Organisation',
      name: 'Contact Name',
      email: 'Email Address',
      message: 'Message',
    },
    submit: 'Send Message',
  },
};

export const notFound = {
  heading: 'Page Not Found',
  body: "The page you're looking for doesn't exist or has been moved.",
  cta: 'Back to Home',
};
