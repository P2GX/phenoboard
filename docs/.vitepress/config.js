// docs/.vitepress/config.js
export default {
  title: 'GA4GH Phenoboard',
  description: 'Documentation for GA4GH Phenoboard',
  lang: 'en-US',
  base: '/phenoboard/',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Introduction', link: '/introduction' },
    ],
    sidebar: [
      { text: 'Introduction', link: '/introduction' },
      {
        text: 'Background',
        link: '/background/background',
        items: [
          { text: 'GA4GH Phenopackets', link: '/background/phenopackets' },
          { text: 'HPO', link: '/background/hpo' },
        ]
      },
      {
        text: 'Applications',
        link: '/applications/applications',
        items: [
          { text: 'GPSEA', link: '/applications/gpsea' },
          { text: 'Validation', link: '/applications/validation' },
        ]
      },
      {
        text: 'Help',
        link: '/help/overview',
        items: [
          { text: 'Installation', link: '/help/installation' },
          { text: 'Start page', link: '/help/start' },
          { text: 'New cohort', link: '/help/newcohort' },
          { text: 'Add case', link: '/help/case' },
          { text: 'Cohort editor', link: '/help/cohort-editor' },
          { text: 'Table editor', link: '/help/table-editor' },
          { text: 'Repo Q/C', link: '/help/repo' },
          { text: 'Entering variant data', link: '/help/variant-data' },
        ]
      },
      {
        text: 'Variants',
        link: '/variants/overview',
        items: [
          { text: 'Structural variants', link: '/variants/structural' },
        ]
      },
      {
        text: 'Developers',
        link: '/developers/overview',
        items: [
          { text: 'Angular tips', link: '/developers/angular' },
          { text: 'Practical tips', link: '/developers/practical' },
          { text: 'Linux', link: '/developers/linux' },
          { text: 'Release', link: '/developers/release' },
        ]
      },
    ],
    socialLinks: [
      // e.g. { icon: 'github', link: 'https://github.com/P2GX/...' }
    ]
  }
}