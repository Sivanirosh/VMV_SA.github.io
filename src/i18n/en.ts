export const siteName = 'VMV Udhavikkaram';
export const fullSiteName = 'VMV Udhavikkaram (Helping Hand)';
export const siteDescription =
  'Supporting free education, student welfare and community development across all twelve wards of Pungudutivu, Sri Lanka.';
export const sectionKicker = 'VMV';

export const images = {
  heroMain: '/images/field/vmv-hero-main.jpg',
  heroAlt: 'Students and community members connected to Sulakshana Free Education Centre',
  projectCover: '/images/field/sulakshana-education-centre.jpg',
  projectCoverAlt: 'Sulakshana Free Education Centre learning space in Pungudutivu',
  storyEducation: '/images/field/computer-classes-library.jpg',
  storyEducationAlt: 'Education activities at Sulakshana Free Education Centre',
  storyCommunity: '/images/field/community-service.jpg',
  storyCommunityAlt: 'Community activities supported by VMV Udhavikkaram',
  aboutTeam: '/images/field/vmv-community.jpg',
  aboutTeamAlt: 'VMV volunteers, teachers and community supporters in Pungudutivu',
  teamMember1: '/images/field/community-supporters.jpg',
  teamMember1Alt: 'VMV community representative',
  teamMember2: '/images/field/education-guidance.jpg',
  teamMember2Alt: 'Sulakshana Education Centre teacher',
  logoMain: '/images/logos/vmv-sa-logo.svg',
  logoAlt: 'VMV Udhavikkaram logo',
} as const;

export const nav = {
  home: 'Home',
  about: 'About',
  projects: 'Education Centre',
  stories: 'Activities',
  contact: 'Contact',
  menuLabel: 'Toggle menu',
};

export const footer = {
  tagline: 'Wisdom, determination and perseverance through education.',
  summary:
    'VMV Udhavikkaram supports Sulakshana Free Education Centre and long-term community initiatives across Pungudutivu.',
  copyright: `© ${new Date().getFullYear()} ${fullSiteName}. All rights reserved.`,
  sections: {
    navigate: 'Navigate',
    focus: 'Focus areas',
    contact: 'Contact',
  },
  focusAreas: ['Free education', 'Student welfare', 'Technology access', 'Community service'],
  contactNote:
    'For enquiries, please contact the VMV committee through the official channels shared by VMV representatives.',
};

export const home = {
  hero: {
    eyebrow: 'Sulakshana Free Education Centre · Pungudutivu',
    headline: 'Education is the helping hand that changes a community.',
    subheadline:
      'VMV Udhavikkaram supports free education, student welfare and village-led development so children across Pungudutivu can build a self-sufficient future.',
    ctaPrimary: 'Explore the Centre',
    ctaSecondary: 'Read Our Story',
    ctaContact: 'Contact VMV',
    cardEyebrow: 'VMV Focus',
    cardTitle: 'Sulakshana Free Education Centre',
  },
  impact: {
    kicker: 'Impact snapshot',
    heading: 'Serving all twelve wards of Pungudutivu',
    subheading:
      'What began as one classroom for 20 students is now a growing education centre with teachers, technology, books and community support.',
    stats: [
      { value: '167', label: 'Students', helper: 'Grades 1 to 11' },
      { value: '9', label: 'Teachers', helper: 'Free education support' },
      { value: '5', label: 'Classrooms', helper: 'At the education centre' },
      { value: '1,800', label: 'Books', helper: 'Pungudi Arivagam library' },
    ],
  },
  currentProject: {
    heading: 'Current Focus',
    linkLabel: 'Visit the Education Centre page',
  },
  storyReel: {
    heading: 'Activity Updates',
    linkLabel: 'Read All Activities',
  },
  programs: {
    heading: 'How VMV Helps',
    subheading:
      'Long-term change needs more than short-term relief. VMV focuses on education, student welfare and practical community support.',
    items: [
      {
        icon: '📚',
        title: 'Free Education',
        body:
          'Sulakshana Free Education Centre provides classes for Grades 1–11, building on Teacher Ashok’s free mathematics teaching since 2005.',
      },
      {
        icon: '💻',
        title: 'Technology & Library',
        body:
          'Computer classes began on 26 January 2024, and Pungudi Arivagam now gives students access to 1,800 donated books.',
      },
      {
        icon: '🤝',
        title: 'Student Welfare',
        body:
          'VMV supports scholarships, laptops, bicycles, first-aid training and a child welfare savings scheme for vulnerable students.',
      },
      {
        icon: '🌱',
        title: 'Community Strength',
        body:
          'The VMV Youth Wing leads shramadhanam cleaning, tree planting and street-light projects that make learning safer and healthier.',
      },
    ],
  },
  partners: {
    heading: 'Built with the village and the diaspora',
    subheading:
      'Every classroom, book, scholarship and bicycle is possible because local leaders and overseas supporters work together.',
    supporters: ['Diaspora donors', 'Teacher Ashok', 'VMV Youth Wing', 'Village well-wishers'],
  },
  newsletter: {
    heading: 'Future planning',
    subheading:
      'VMV is preparing wider classes for Pungudutivu students, A/L seminars, vocational guidance and transport support from distant wards.',
    cta: 'Discuss future support',
    disclaimer: 'The website will add official public contact details once confirmed by VMV.',
  },
};

export const about = {
  meta: {
    title: `About — ${siteName}`,
    description:
      'The origin, mission and values of VMV Udhavikkaram and Sulakshana Free Education Centre.',
  },
  hero: {
    eyebrow: 'Our story',
    heading: 'About VMV Udhavikkaram',
    subheading:
      'A community and diaspora-supported helping hand for education and welfare in Pungudutivu.',
  },
  mission: {
    heading: 'Our Mission',
    paragraphs: [
      'VMV Udhavikkaram believes education is the path to a capable, independent-thinking and self-sufficient society.',
      'The organisation supports Sulakshana Free Education Centre so children from every ward of Pungudutivu can learn without regional bias and without free goods or short-term relief becoming the only answer.',
    ],
  },
  origin: {
    heading: 'Our Story',
    paragraphs: [
      'Vallan, Mavuththidal and Veeramamlai Helping Hand began during 2017–2018 through Mr. Sellathurai Sathananthan and well-wishers from the villages.',
      'During the COVID-19 years of 2021 and 2022, the organisation worked with the diaspora to provide dry rations, assistance for pregnant mothers, aid for elderly people and support for school students.',
      'In April 2022, a major milestone began with a child welfare savings scheme: Rs. 25,000 was deposited for each of 25 children from the villages.',
      'VMV then partnered with Teacher Ashok, who has provided free mathematics education since 2005, to strengthen Sulakshana Free Education Centre as the organisation’s central education initiative.',
    ],
  },
  values: {
    heading: 'What VMV Stands For',
    items: [
      { letter: 'V', word: 'Vivekam', meaning: 'Wisdom / prudence' },
      { letter: 'M', word: 'Mana-uruthi', meaning: 'Mental fortitude / determination' },
      { letter: 'V', word: 'Vida-muyarchi', meaning: 'Perseverance' },
    ],
  },
  milestones: {
    heading: 'Milestones',
    items: [
      {
        year: '2017–2018',
        title: 'Helping Hand begins',
        body: 'Mr. Sellathurai Sathananthan and village well-wishers start the Vallan, Mavuththidal and Veeramamlai Helping Hand effort.',
      },
      {
        year: '2021–2022',
        title: 'COVID-19 relief',
        body: 'Diaspora-supported relief reaches families, pregnant mothers, elderly people and students during the pandemic.',
      },
      {
        year: 'April 2022',
        title: 'Child welfare savings',
        body: 'Rs. 25,000 is deposited for each of 25 children as a long-term welfare commitment.',
      },
      {
        year: '26 January 2024',
        title: 'Computer classes begin',
        body: 'Diaspora donors help start computer classes so students can improve their technological knowledge.',
      },
    ],
  },
  leadership: {
    heading: 'People Guiding the Work',
    members: [
      {
        name: 'Mr. Sellathurai Sathananthan and village well-wishers',
        role: 'Founding initiative',
        bio: 'Started the Helping Hand effort for Vallan, Mavuththidal and Veeramamlai during 2017–2018.',
      },
      {
        name: 'Teacher Ashok',
        role: 'Education guidance',
        bio: 'A long-standing free mathematics teacher whose guidance helped Sulakshana Free Education Centre grow into VMV’s central education initiative.',
      },
    ],
  },
  centre: {
    heading: 'Sulakshana Free Education Centre Today',
    paragraphs: [
      'The centre began with one classroom and 20 students.',
      'It now serves 167 students from Grades 1 to 11 across all twelve wards of Pungudutivu, with five classrooms and nine teachers.',
    ],
  },
};

export const projects = {
  meta: {
    title: `Sulakshana Free Education Centre — ${siteName}`,
    description:
      'The central education initiative of VMV Udhavikkaram in Pungudutivu, Sri Lanka.',
  },
  heading: 'Sulakshana Free Education Centre',
  subheading:
    'A growing free education centre serving students from all twelve wards of Pungudutivu.',
  statusLabels: {
    planned: 'Planned',
    'in-progress': 'In Progress',
    completed: 'Completed',
  },
  labels: {
    studentsServed: 'Students',
    classroomsBuilt: 'Classrooms',
    volunteersInvolved: 'Teachers',
    started: 'Started',
    completed: 'Completed',
  },
};

export const stories = {
  meta: {
    title: `Activities — ${siteName}`,
    description:
      'Activities and milestones from VMV Udhavikkaram, Sulakshana Free Education Centre and the Pungudutivu community.',
  },
  heading: 'Activities & Milestones',
  subheading:
    'Updates from the education centre, student welfare work, youth wing and community projects supported by VMV.',
  labels: {
    published: 'Published',
    titleSuffix: 'Activities',
  },
};

export const contact = {
  meta: {
    title: `Contact — ${siteName}`,
    description:
      'Contact VMV Udhavikkaram about Sulakshana Free Education Centre, student welfare and community support.',
  },
  hero: {
    heading: 'Contact VMV',
    subheading:
      'For questions about Sulakshana Free Education Centre, student welfare or future support, please contact the VMV committee through official VMV representative channels.',
  },
  intro: {
    heading: 'Current support discussions',
    paragraphs: [
      'VMV is focusing on education for students across Pungudutivu, transport support for distant wards, A/L seminars, vocational guidance and student welfare needs.',
      'Official public contact details will be added here once they are confirmed by the VMV committee.',
    ],
  },
  focus: {
    heading: 'Useful topics to mention',
    items: [
      'Sulakshana Free Education Centre classes',
      'Computer learning and library support',
      'Bicycles, scholarships or laptops for students',
      'Transport support from distant wards',
      'A/L seminars and vocational guidance',
      'VMV Youth Wing community activities',
    ],
  },
};

export const notFound = {
  heading: 'Page Not Found',
  body: "The page you're looking for doesn't exist or has been moved.",
  cta: 'Back to Home',
};
