// The main menu. `children` appear in a dropdown under their parent.
// /podcast, /survey, /video4survey and /surveythanks stay out of the menu, as on Wix.
export const nav = [
  { label: 'Home', href: '/' },
  {
    label: 'Community',
    href: '/community',
    children: [
      { label: 'Individuals', href: '/individuals' },
      { label: 'Organisations', href: '/organisations' },
      { label: 'Projects', href: '/educational-projects' },
    ],
  },
  {
    label: 'Research',
    href: '/research',
    children: [
      { label: 'Publications', href: '/publications' },
      { label: 'Projects', href: '/research-projects' },
      { label: 'Suggest a publication', href: '/suggest-publication' },
    ],
  },
  {
    label: 'Instruments',
    href: '/instruments',
    children: [
      { label: 'Woodwinds', href: '/woodwinds' },
      { label: 'Brass', href: '/brass' },
      { label: 'Other', href: '/other' },
    ],
  },
  { label: 'Contact', href: '/contact' },
];

export const FACEBOOK = 'https://www.facebook.com/groups/ecime';
export const EMAIL = 'info@ecime.org';
