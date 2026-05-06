// Recipe data — same content, restyled.
const RECIPE = {
  id: 'shakshuka',
  title: 'Shakshuka',
  subtitle: 'Eggs poached in a peppery tomato sauce',
  source: 'House recipe',
  servings: 4,
  totalMinutes: 35,
  activeMinutes: 15,
  difficulty: 'Easy',
  tags: ['Brunch', 'One-pan', 'Vegetarian'],
  description: 'A North African breakfast standby. The trick: build the sauce until it tastes like itself before the eggs go in — taste, salt, taste again.',
  ingredients: [
    { group: 'Sauce', items: [
      { id: 'oil', qty: '3 tbsp', name: 'olive oil' },
      { id: 'onion', qty: '1 large', name: 'yellow onion, diced' },
      { id: 'pepper', qty: '1', name: 'red bell pepper, diced' },
      { id: 'garlic', qty: '4 cloves', name: 'garlic, sliced' },
      { id: 'cumin', qty: '2 tsp', name: 'ground cumin' },
      { id: 'paprika', qty: '2 tsp', name: 'smoked paprika' },
      { id: 'chili', qty: '½ tsp', name: 'chili flakes' },
      { id: 'tomato', qty: '28 oz', name: 'whole peeled tomatoes' },
      { id: 'salt', qty: 'to taste', name: 'kosher salt' },
    ]},
    { group: 'To finish', items: [
      { id: 'eggs', qty: '6', name: 'large eggs' },
      { id: 'feta', qty: '½ cup', name: 'feta, crumbled' },
      { id: 'parsley', qty: '¼ cup', name: 'parsley, chopped' },
      { id: 'bread', qty: '1 loaf', name: 'crusty bread' },
    ]},
  ],
  steps: [
    { n: 1, title: 'Sweat the aromatics', instruction: 'Warm olive oil in a wide skillet over medium heat. Add onion and bell pepper. Cook until soft and translucent — don\'t rush this.', detail: 'Collapse, not color', timer: { minutes: 8, label: 'Soften' }, uses: ['oil', 'onion', 'pepper'] },
    { n: 2, title: 'Bloom the spices', instruction: 'Add garlic, cumin, paprika, and chili flakes. Stir constantly for 60 seconds until fragrant.', detail: 'Spices in oil, not water', timer: { minutes: 1, label: 'Bloom' }, uses: ['garlic', 'cumin', 'paprika', 'chili'], tip: 'If it smells acrid, pull the pan off the heat for ten seconds.' },
    { n: 3, title: 'Build the sauce', instruction: 'Crush tomatoes by hand into the pan. Season with salt. Simmer until thickened — a spoon should leave a clear trail across the pan.', detail: 'Sauce, not soup', timer: { minutes: 12, label: 'Reduce' }, uses: ['tomato', 'salt'] },
    { n: 4, title: 'Make six wells', instruction: 'With the back of a spoon, press six shallow wells into the sauce. Crack one egg into each.', detail: 'Wells, not holes', timer: null, uses: ['eggs'] },
    { n: 5, title: 'Cover and poach', instruction: 'Cover and reduce heat to low. Cook until whites are set but yolks are still loose.', detail: 'Lift the lid at six minutes', timer: { minutes: 7, label: 'Poach' }, uses: [], tip: 'Jiggle the pan. Yolks should wobble, whites shouldn\'t.' },
    { n: 6, title: 'Finish and serve', instruction: 'Scatter feta and parsley over the top. Bring the pan to the table with bread.', detail: 'Serve immediately', timer: null, uses: ['feta', 'parsley', 'bread'] },
  ],
};

const BROWSE = [
  { id: 'shakshuka', title: 'Shakshuka', tags: 'brunch · one-pan · 35min', mark: 'SH', tone: 'warm', curated: true },
  { id: 'risotto', title: 'Mushroom Risotto', tags: 'dinner · italian · 45min', mark: 'MR' },
  { id: 'roast', title: 'Roast Chicken with Lemon', tags: 'dinner · sunday · 1h 20min', mark: 'RC', tone: 'deep' },
  { id: 'ramen', title: 'Miso Ramen', tags: 'comfort · japanese · 40min', mark: 'MR', tone: 'deep' },
  { id: 'salad', title: 'Charred Broccoli, Tahini', tags: 'side · fast · 20min', mark: 'CB' },
  { id: 'pasta', title: 'Cacio e Pepe', tags: 'quick · italian · 15min', mark: 'CP', tone: 'warm' },
  { id: 'cake', title: 'Olive Oil Cake', tags: 'baking · sunday · 1h', mark: 'OC' },
];

// Tiny line-icon set
function Icon({ name, size = 14 }) {
  const p = {
    search: <path d="M11 4a7 7 0 1 0 4.5 12.3L20 21" strokeLinecap="round" fill="none"/>,
    plus: <path d="M12 5v14M5 12h14" strokeLinecap="round"/>,
    minus: <path d="M5 12h14" strokeLinecap="round"/>,
    check: <path d="M5 12l5 5 9-11" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
    close: <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/>,
    chevR: <path d="M9 5l7 7-7 7" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
    chevL: <path d="M15 5l-7 7 7 7" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
    play: <path d="M8 5v14l11-7L8 5z"/>,
    pause: <><rect x="7" y="5" width="3" height="14"/><rect x="14" y="5" width="3" height="14"/></>,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3" fill="none"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" fill="none"/></>,
    flame: <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 1-9z" fill="none" strokeLinejoin="round"/>,
    timer: <><circle cx="12" cy="13" r="7" fill="none"/><path d="M12 9v4l2 2M9 3h6" strokeLinecap="round" fill="none"/></>,
    home: <path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4v-9z" fill="none" strokeLinejoin="round"/>,
    book: <path d="M5 4h7a3 3 0 0 1 3 3v13H7a2 2 0 0 0 2 2H5V4z" fill="none" strokeLinejoin="round"/>,
    heart: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill="none" strokeLinejoin="round"/>,
    star: <path d="M12 3l2.5 6 6.5.5-5 4.5 1.5 6.5-5.5-3.5L6.5 20.5 8 14 3 9.5l6.5-.5L12 3z" fill="none" strokeLinejoin="round"/>,
    list: <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round"/>,
    sparkle: <path d="M12 3l1.5 5L18 9.5 13.5 11 12 16l-1.5-5L6 9.5 10.5 8 12 3z" fill="none" strokeLinejoin="round"/>,
    back: <path d="M19 12H5m0 0l6-6m-6 6l6 6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" fill="currentColor">{p[name] || null}</svg>;
}

function HeroFrame({ label, code, title, accentTitle }) {
  return (
    <div className="rr-hero">
      <div className="rr-hero__stripes" />
      <div className="rr-hero__label">{label}</div>
      <div className="rr-hero__corner">{code}</div>
      <div className="rr-hero__title">{title} <span className="accent">{accentTitle}</span></div>
    </div>
  );
}

Object.assign(window, { RECIPE, BROWSE, Icon, HeroFrame });
