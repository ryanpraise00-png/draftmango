/*
 * Framo — showcase.js
 *
 * The template showing itself: the Demos page cards, the Home's live Style
 * Switcher and the icon browser. Linked only by those pages. A site built
 * from Framo does not need this file.
 */
(function (exports) {
    'use strict';

    /**
     * brands.js — The brand colours, by name.
     *
     * The one list the switcher's controls (controls.js) and the demo registry
     * (../demos.js, which main.js bundles) share. It lives apart from the controls
     * so that a page reading the names does not load the switcher with them.
     */

    const BRANDS = Object.freeze(['primary', 'secondary', 'tertiary', 'quaternary', 'accent']);

    /**
     * demos.js — The demo registry: every demo of Framo, its theme, presets and
     * Style Switcher features. The build reads it (theme link and locks per page,
     * the Demos page, Vite inputs); the switcher reads it (presets, hidden groups).
     *
     * A demo: { id, name, categories, page, pages, theme, thumbnail, presets, shapes, shape, switcher }
     *   id         'main' (the template itself) or '<name>-<n>' ('law-1')
     *   categories CATEGORIES ids; the first is the label on the Demos card, the
     *              Demos tabs list the demo under each
     *   page       what the Demos card opens; pages: the demo's own pages (Vite inputs)
     *   theme      'theme' (assets/css/theme.css) or 'demo-<id>' (assets/css/themes/demo-<id>.css)
     *   thumbnail  'pending' (a drawn tile) or 'screenshots' (media/demos/<id>/<preset>.webp, <preset>-dark.webp)
     *   presets    [{ id, name, colors: { primary … accent }, on: { primary … accent: 'auto' | 'light' } }]
     *              — the first equals the theme file's colours
     *   shapes     corner stops the Demos card offers (controls.js 'corners' stops)
     *   shape      the demo's own corner stop, one of `shapes` ('default' for Main); the card
     *              pre-selects "Default", which opens the demo as designed, with this shape
     *   switcher   { scheme: false → no dark mode (a demo dark by design: no Light/Dark choice on its
     *              Demos card or in the switcher); hide: switcher groups to leave out }
     */

    /** A preset from five seeds in BRANDS order; `light`: the fills whose text is pinned white. */
    function preset(id, name, seeds, light = []) {
        return {
            id,
            name,
            colors: Object.fromEntries(BRANDS.map((brand, i) => [brand, seeds[i]])),
            on: Object.fromEntries(
                BRANDS.map((brand) => [brand, light.includes(brand) ? 'light' : 'auto']),
            ),
        };
    }

    // Light text where white reads at least as well as dark by APCA, though under 4.5:1 by WCAG 2
    const MAIN_PRESETS = [
        preset('blue', 'Blue', ['#3452ff', '#0f4c81', '#864ffe', '#64748b', '#ff3d5c']),
        preset(
            'green',
            'Green',
            ['#67bc7c', '#1f4d36', '#2bb3b1', '#66766d', '#f25f5c'],
            ['primary', 'tertiary', 'accent'],
        ),
        preset(
            'slate',
            'Slate',
            ['#446084', '#1c2a40', '#4fa3b8', '#6b7280', '#f08a4b'],
            ['tertiary', 'accent'],
        ),
        preset(
            'violet',
            'Violet',
            ['#745cd4', '#2d2163', '#ed65a8', '#6e6a80', '#f5a524'],
            ['tertiary'],
        ),
        preset('cyan', 'Cyan', ['#00d0ec', '#0a4a5c', '#6d5dfc', '#5f7380', '#ff5a5f'], ['accent']),
        preset(
            'coral',
            'Coral',
            ['#ff6b3d', '#6e2613', '#f95a90', '#78716c', '#0e9f9a'],
            ['primary', 'tertiary', 'accent'],
        ),
        preset(
            'gold',
            'Gold',
            ['#e8bd33', '#1f2b4a', '#f0802a', '#78716c', '#d1343b'],
            ['tertiary'],
        ),
    ];

    const CORPORATE_1_PRESETS = [
        preset('teal', 'Teal', ['#0c8284', '#0a2a2e', '#5bbfae', '#5b7275', '#f0a13a']),
        preset(
            'navy',
            'Navy',
            ['#1e3f78', '#0e1e3a', '#3aa5a0', '#5f6b7c', '#e2a93b'],
            ['tertiary'],
        ),
        preset(
            'emerald',
            'Emerald',
            ['#14795a', '#0c2e24', '#c8a35a', '#5c6e66', '#e2604e'],
            ['tertiary', 'accent'],
        ),
        preset(
            'wine',
            'Wine',
            ['#8a2b45', '#2a1018', '#c28f5c', '#6f6266', '#29827d'],
            ['tertiary'],
        ),
        preset(
            'graphite',
            'Graphite',
            ['#2f3540', '#15181d', '#0c8284', '#6b7280', '#e8763a'],
            ['accent'],
        ),
    ];

    const AGENCY_1_PRESETS = [
        preset('violet', 'Violet', ['#6236f0', '#1a1442', '#c23392', '#6c6789', '#ffb23f']),
        preset('ocean', 'Ocean', ['#2453ff', '#0b1638', '#0e9fb3', '#5f6b85', '#ffb23f']),
        preset(
            'sunset',
            'Sunset',
            ['#e8492b', '#2a0f17', '#d6337f', '#7a6a6d', '#ffc53d'],
            ['primary'],
        ),
        preset('mint', 'Mint', ['#0b7d61', '#08241f', '#4c5ce4', '#5f716b', '#ffb23f']),
        preset('graphite', 'Graphite', ['#1f1d2b', '#0b0b10', '#6236f0', '#6b7280', '#ffb23f']),
    ];

    const AGENCY_2_PRESETS = [
        preset('lime', 'Lime', ['#8ee26b', '#06302b', '#6d5ef0', '#5b716d', '#ffc24b']),
        preset(
            'ocean',
            'Ocean',
            ['#4f8bff', '#0a1f3d', '#2fd5a8', '#5d6b80', '#ffc24b'],
            ['primary'],
        ),
        preset(
            'coral',
            'Coral',
            ['#ff7a59', '#2a1612', '#6d5ef0', '#75686a', '#ffc24b'],
            ['primary'],
        ),
        preset('sun', 'Sun', ['#ffd23f', '#1b1a14', '#4f7dff', '#6f6c62', '#ff6b5a'], ['tertiary']),
        preset(
            'violet',
            'Violet',
            ['#9a8cff', '#17113a', '#8ee26b', '#67637f', '#ffc24b'],
            ['primary'],
        ),
    ];

    // Cobalt's accent, Emerald's primary and Ember's primary and accent sit a shade deeper than their swatch, so white
    // text reads on them: the two primaries as far as the light end of the demo's gradient (4.6:1)
    const AI_AGENCY_1_PRESETS = [
        preset('violet', 'Violet', ['#6a00f4', '#12093a', '#2f8fff', '#6a6788', '#ff5fa8']),
        preset('cobalt', 'Cobalt', ['#1f4bff', '#0a1238', '#18c5d9', '#636b85', '#7d4fff']),
        preset('emerald', 'Emerald', ['#00785c', '#06261f', '#3fb6ff', '#5c716b', '#c6f26b']),
        preset('ember', 'Ember', ['#cb2507', '#2b0f12', '#ff9f1c', '#7a6a6c', '#b02ef0']),
        preset('graphite', 'Graphite', ['#22212b', '#0c0c12', '#6a00f4', '#6b6b7b', '#ff5fa8']),
    ];

    // Three pastels over an ink: the demo's data panels take the tertiary, the quaternary and the accent
    // (dark text on each); the fourth panel tone is a turn of the tertiary's hue
    const SEO_AGENCY_1_PRESETS = [
        preset('paper', 'Paper', ['#1c1a17', '#2a2622', '#dcaefc', '#bfe0ff', '#d6f76a']),
        preset('coast', 'Coast', ['#14213d', '#1b2a4a', '#b9dcff', '#b4eed3', '#ffe27a']),
        preset('orchard', 'Orchard', ['#17301f', '#1f3b29', '#f8e38a', '#ffc7a6', '#b8ef9c']),
        preset('rosewood', 'Rosewood', ['#3a1730', '#46203b', '#ffc0d3', '#dcc4ff', '#ffcf9c']),
        preset('slate', 'Slate', ['#22252b', '#2b2f37', '#d9dde3', '#c6ccd4', '#d6f76a']),
    ];

    // One saturated action colour with dark text on it (it is also the hero's disc), an ink for the dark
    // sheets, a pale tint of the primary, a cool or warm counterpoint and a rare accent. Graphite's action
    // is the ink: the demo keeps its orange disc when the primary has no hue
    const FREELANCER_1_PRESETS = [
        preset('ember', 'Ember', ['#ff6a3a', '#151413', '#ffd8c8', '#cfdcff', '#ffc23a']),
        preset('cobalt', 'Cobalt', ['#5b88ff', '#10131c', '#d6e0ff', '#ffdccb', '#ffc23a']),
        preset('forest', 'Forest', ['#3fa672', '#111612', '#cfeedb', '#ffe1c4', '#ffc23a']),
        preset('plum', 'Plum', ['#b26fd0', '#17121a', '#f0d9f8', '#cfe4ff', '#ffb84d']),
        preset('graphite', 'Graphite', ['#201f1d', '#151413', '#e6e3dd', '#cfdcff', '#ff6a3a']),
    ];

    // A saturated action colour with white labels (it is also the one full colour band), an ink for the
    // footer, a pale panel tint, and two small cursor colours (the quaternary and the accent). Graphite's
    // action is an ink: the cursors keep their sky and coral
    const CREATIVE_STUDIO_1_PRESETS = [
        preset('cobalt', 'Cobalt', ['#1f4ae0', '#0d1226', '#dfe4ff', '#8fb3ff', '#ff7a59']),
        preset('indigo', 'Indigo', ['#4b3df5', '#110e2e', '#e4e1ff', '#a99cff', '#ff7a59']),
        preset('teal', 'Teal', ['#0b7f86', '#0a1e22', '#d6efee', '#7fd3cc', '#ff7a59']),
        preset('crimson', 'Crimson', ['#c8233c', '#1f0c12', '#ffe0e4', '#ffb08f', '#f2b94b']),
        preset('graphite', 'Graphite', ['#23263a', '#0d0f16', '#e3e5ee', '#8fb3ff', '#ff7a59']),
    ];

    // An emerald action colour with dark labels (it is also the closing panel and the hero's highlight),
    // a green-black for the dark panel, a mint for quiet panels, a lime and a sun used rarely; the hero's
    // colour chips show these five. Forest and Teal take white labels (Teal sits a shade deeper than
    // #0f8b86 so white reads at 4.5:1); Graphite's action is an ink and keeps the emerald as its accent
    const BRANDING_STUDIO_1_PRESETS = [
        preset('emerald', 'Emerald', ['#14b86a', '#0e1f17', '#d3f2e1', '#c9f26b', '#ffd84a']),
        preset('forest', 'Forest', ['#1d6b47', '#0c1a13', '#d6eadc', '#c9f26b', '#ffd84a']),
        preset('lime', 'Lime', ['#8fcf1f', '#14200b', '#e6f4cc', '#9fe3c4', '#ffd84a']),
        preset('teal', 'Teal', ['#0d827d', '#0a1d1c', '#d2efec', '#c9f26b', '#ffd84a']),
        preset('graphite', 'Graphite', ['#1f2622', '#0e1210', '#e2e8e3', '#c9f26b', '#14b86a']),
    ];

    // A periwinkle-violet action colour with white labels, a violet-black ink for the dark panel, a
    // periwinkle and a sky for tiles, and a marigold for the stickers and the closing panel. Marigold
    // takes ink labels and turns the stickers periwinkle (ink on them); Coral pins white labels (white
    // reads as well as ink there by APCA); Lagoon sits deep enough for white at 4.5:1; Ink makes the
    // action the violet-black and keeps the marigold
    const MARKETING_1_PRESETS = [
        preset('periwinkle', 'Periwinkle', ['#6754e9', '#16132b', '#b1b3ff', '#a9caff', '#ffbd14']),
        preset('marigold', 'Marigold', ['#f5a800', '#16132b', '#ffd98a', '#a9caff', '#b1b3ff']),
        preset(
            'coral',
            'Coral',
            ['#e8513f', '#1f1416', '#ffc2b5', '#a9caff', '#ffbd14'],
            ['primary'],
        ),
        preset('lagoon', 'Lagoon', ['#0d827d', '#0d1f1e', '#a6e3dc', '#a9caff', '#ffbd14']),
        preset('ink', 'Ink', ['#16132b', '#16132b', '#b1b3ff', '#a9caff', '#ffbd14']),
    ];

    const HOLDING_1_PRESETS = [
        preset('crimson', 'Crimson', ['#d2203a', '#141519', '#c9bfb3', '#5d6470', '#b8893b']),
        preset('navy', 'Navy', ['#1d3461', '#0f1729', '#c9bfb3', '#5d6470', '#c23a3a']),
        preset('oxblood', 'Oxblood', ['#8c1d2e', '#1a1012', '#d6c7b5', '#66606a', '#b8893b']),
        preset('bronze', 'Bronze', ['#9c6c2c', '#1a1712', '#d8cbb8', '#635f58', '#8c1d2e']),
        preset('graphite', 'Graphite', ['#2b2f36', '#121417', '#c9bfb3', '#5d6470', '#d2203a']),
    ];

    const ENGINEERING_1_PRESETS = [
        preset(
            'orange',
            'Safety Orange',
            ['#f26322', '#1b1e22', '#808c98', '#bdb8ae', '#f2b705'],
            ['primary'],
        ),
        preset('yellow', 'Signal Yellow', ['#f2b705', '#1b1e22', '#808c98', '#bdb8ae', '#f26322']),
        preset('steel', 'Steel Blue', ['#2f5d8a', '#151c24', '#8a99a8', '#bdb8ae', '#f2b705']),
        preset('brick', 'Brick', ['#b5452c', '#1f1a18', '#938a84', '#c4b9ab', '#f2b705']),
        preset('graphite', 'Graphite', ['#2b2f36', '#15171a', '#808c98', '#bdb8ae', '#f26322']),
    ];

    const INVESTMENT_1_PRESETS = [
        preset(
            'evergreen',
            'Evergreen',
            ['#2e9e62', '#0f2a20', '#b9d3bf', '#8f8a7e', '#b48a4a'],
            ['primary'],
        ),
        preset('burgundy', 'Burgundy', ['#8a2840', '#2a1018', '#e2c6cc', '#8f8a7e', '#b48a4a']),
        preset('navy', 'Navy', ['#1f3a68', '#0e1a30', '#c3cfe2', '#848a94', '#b48a4a']),
        preset('brass', 'Brass', ['#9c6c2c', '#231b10', '#e3d3b6', '#8f8a7e', '#2e9e62']),
        preset('ink', 'Ink', ['#1d2420', '#101512', '#b9d3bf', '#8f8a7e', '#b48a4a']),
    ];

    // Royal blue for the actions (white labels by Auto), ink navy for the slabs, ice for quiet fills,
    // slate for meta, amber for the exhibit markers
    const CONSULTING_1_PRESETS = [
        preset('royal-blue', 'Royal Blue', ['#0d58d8', '#0b1630', '#cfe0ff', '#5b6b82', '#f2a516']),
        preset('navy', 'Navy', ['#1c2f5a', '#0c1424', '#d3dcef', '#5b6b82', '#f2a516']),
        preset('petrol', 'Petrol', ['#0e6670', '#0a2226', '#cde6e8', '#5a6e72', '#f2a516']),
        preset('crimson', 'Crimson', ['#b3263e', '#1c1016', '#f3d3d9', '#6b6168', '#f2a516']),
        preset('graphite', 'Graphite', ['#2a2f38', '#121417', '#d9dde4', '#5f6672', '#f2a516']),
    ];

    // Olive sage with ink labels (Auto), near-black slabs, stone fills, moss grey meta, brass knots;
    // Clay is #b0613a (spec #b5643c) so its white label reaches 4.5:1
    const EXECUTIVE_COACH_1_PRESETS = [
        preset(
            'sage',
            'Sage',
            ['#869462', '#1b1c19', '#e7e1d6', '#6d7264', '#b98a45'],
            ['primary'],
        ),
        preset('forest', 'Forest', ['#2f5d46', '#151a17', '#dfe5dc', '#6a7268', '#b98a45']),
        preset('plum', 'Plum', ['#6b3f62', '#1d151b', '#eadfe6', '#71686f', '#b98a45']),
        preset('clay', 'Clay', ['#b0613a', '#1f1a17', '#efe1d6', '#736a62', '#869462']),
        preset('ink', 'Ink', ['#24262a', '#121315', '#e7e1d6', '#6d7264', '#b98a45']),
    ];

    // Coral with white labels by choice (about 3.3:1), aubergine ink panels, blush fills, sage meta,
    // sun accent; Rose is #c8496d (spec #d14d72) so its white label reaches 4.5:1
    const LIFE_COACH_1_PRESETS = [
        preset(
            'coral',
            'Coral',
            ['#ec6033', '#2b2238', '#f6d9cb', '#8a9e7b', '#f4b740'],
            ['primary'],
        ),
        preset('rose', 'Rose', ['#c8496d', '#2a1c26', '#f6d6df', '#8a9e7b', '#f4b740']),
        preset('sage', 'Sage', ['#5f7d55', '#1f261d', '#dfe8d8', '#a08c7a', '#f4b740']),
        preset('ocean', 'Ocean', ['#23779a', '#14222c', '#d4e7ef', '#8a9e7b', '#f4b740']),
        preset('plum', 'Plum', ['#7a4a8c', '#261b2c', '#e8daee', '#8a9e7b', '#f4b740']),
    ];

    // Sapphire with white labels (Auto), ink navy slabs, stone fills, slate meta, gold line-work
    const WEALTH_1_PRESETS = [
        preset('sapphire', 'Sapphire', ['#1e3d8f', '#0e1a33', '#e9e2d4', '#5f6878', '#c29a55']),
        preset('navy', 'Navy', ['#1b2a4a', '#0d1424', '#e6e1d6', '#5f6878', '#c29a55']),
        preset('bottle', 'Bottle', ['#1f5a46', '#0d211a', '#e4e4d6', '#5f6e68', '#c29a55']),
        preset('burgundy', 'Burgundy', ['#7a2438', '#22111a', '#ece0da', '#6d6268', '#c29a55']),
        preset('graphite', 'Graphite', ['#2d3138', '#131518', '#e7e3db', '#62666e', '#c29a55']),
    ];

    // Ledger green with white labels, pine slabs, mint fills, sage-grey meta, a soft lime highlighter (peach beside the blue and plum)
    const ACCOUNTING_1_PRESETS = [
        preset('green', 'Green', ['#23845a', '#0f2e24', '#d3f3e1', '#64746c', '#c3e86b']),
        preset('teal', 'Teal', ['#0f7a7a', '#0b2727', '#d1efee', '#5f7272', '#c3e86b']),
        preset('ocean', 'Ocean', ['#1f5fbf', '#0e1d36', '#d6e4fa', '#5f6b7c', '#ffb18c']),
        preset('plum', 'Plum', ['#6d3a82', '#22152a', '#ecdff2', '#6c6472', '#ffb18c']),
        preset('ink', 'Ink', ['#1f2a2a', '#0f1515', '#dde7e2', '#64746c', '#c3e86b']),
    ];

    // Violet with white labels, ink for the security band and footer, lavender fills, grey-violet meta,
    // sky for chart lines and active states; Teal is #0b8080 (spec #0d8a8a) and Coral #cf422c (spec #e5533d)
    // so their white labels reach 4.5:1
    const BANKING_1_PRESETS = [
        preset('violet', 'Violet', ['#5b4af7', '#120f2e', '#e7e3ff', '#6b6888', '#4cc2ff']),
        preset('blue', 'Blue', ['#2f5bea', '#0c1430', '#dfe6ff', '#666c88', '#4cc2ff']),
        preset('teal', 'Teal', ['#0b8080', '#0a2424', '#d3f0ee', '#627676', '#4cc2ff']),
        preset('coral', 'Coral', ['#cf422c', '#2a1210', '#fde0da', '#7a6866', '#4cc2ff']),
        preset('ink', 'Ink', ['#1c1b29', '#0d0c16', '#e4e2ef', '#6b6888', '#4cc2ff']),
    ];

    // Lime with ink labels (Auto), forest slabs, pale lime fills, warm grey meta, terracotta roof lines
    const MORTGAGE_1_PRESETS = [
        preset('lime', 'Lime', ['#a7e03e', '#13261b', '#eef8d8', '#6e7366', '#e2774a']),
        preset('mint', 'Mint', ['#3fc28a', '#10261c', '#dcf5e9', '#6a736d', '#e2774a']),
        preset('sky', 'Sky', ['#4aa8e8', '#0f1f2e', '#dcedfa', '#6a7078', '#e2774a']),
        preset('sun', 'Sun', ['#f2c230', '#26200f', '#fbf1cf', '#73705f', '#e2774a']),
        preset('forest', 'Forest', ['#2c5e3f', '#10201a', '#e1ecd8', '#6e7366', '#e2774a']),
    ];

    // Amber with ink labels (Auto) on a dark-led page: ink and graphite grounds, steel meta, up-green
    // accent (the down-red is fixed in the demo CSS, not a brand colour); Violet is #9478ff (spec #8b6cff)
    // so its ink label reaches 4.5:1
    const TRADING_1_PRESETS = [
        preset('amber', 'Amber', ['#ff8b2a', '#0c0e12', '#1c2028', '#8a93a3', '#35d08a']),
        preset('lime', 'Lime', ['#b6e83a', '#0c0e12', '#1c2028', '#8a93a3', '#35d08a']),
        preset('cyan', 'Cyan', ['#28c8e8', '#0c0e12', '#1c2028', '#8a93a3', '#35d08a']),
        preset('violet', 'Violet', ['#9478ff', '#0c0e12', '#1c2028', '#8a93a3', '#35d08a']),
        preset('rose', 'Rose', ['#ff5f8f', '#0c0e12', '#1c2028', '#8a93a3', '#35d08a']),
    ];

    // Blue with white labels, navy ink for the Ask Framo and metrics bands and the footer, ice fills,
    // slate meta, mint for up deltas and the second chart series; Teal is #0c8380 (spec #0e8a87) and Rose
    // #d4386a (spec #d63a6a) so their white labels reach 4.5:1
    const ANALYTICS_1_PRESETS = [
        preset('blue', 'Blue', ['#3452ff', '#0b1230', '#e3e9ff', '#5d6680', '#21c08b']),
        preset('indigo', 'Indigo', ['#4b3fe0', '#120f33', '#e6e3ff', '#64627f', '#21c08b']),
        preset('teal', 'Teal', ['#0c8380', '#0a2526', '#d3f0ee', '#5f7474', '#21c08b']),
        preset('rose', 'Rose', ['#d4386a', '#2a0f1a', '#fde2ea', '#7a6670', '#21c08b']),
        preset('ink', 'Ink', ['#1b2236', '#0b0f1c', '#e3e6ef', '#5d6680', '#21c08b']),
    ];

    // Orange on warm paper: espresso-ink bands and footer, peach fills, warm-grey meta, green run lights
    // with ink labels; Orange and Emerald pin white labels (about 3.1:1 and 3.2:1, the demo's choice);
    // Tomato is #d93d28 (spec #e5432e) so its white label reaches 4.5:1
    const AUTOMATION_1_PRESETS = [
        preset(
            'orange',
            'Orange',
            ['#ff5b1f', '#16120f', '#ffe6da', '#7a716a', '#2fbf71'],
            ['primary'],
        ),
        preset('tomato', 'Tomato', ['#d93d28', '#1a0f0c', '#ffe2dc', '#7d6f6a', '#2fbf71']),
        preset('cobalt', 'Cobalt', ['#2f5bea', '#0c1022', '#e2e8ff', '#6b7185', '#2fbf71']),
        preset(
            'emerald',
            'Emerald',
            ['#11a37f', '#0a1612', '#d8f2e8', '#6b7873', '#2fbf71'],
            ['primary'],
        ),
        preset('espresso', 'Espresso', ['#2a221d', '#16120f', '#ece6df', '#7a716a', '#2fbf71']),
    ];

    // Violet with white labels on a dark-led page: ink grounds and footer, graphite panels, mist meta,
    // pink for one word, live dots and gradients (peach in Magenta, whose primary is pink already);
    // Cyan, Lime and Amber take ink labels; Violet is #8752fc (spec #8a55ff) and Magenta #d0388a (spec
    // #e8459b) so their white labels reach 4.5:1
    const AI_STUDIO_1_PRESETS = [
        preset('violet', 'Violet', ['#8752fc', '#0c0b11', '#16141d', '#9a95ab', '#ff6fb1']),
        preset('magenta', 'Magenta', ['#d0388a', '#0c0b11', '#16141d', '#9a95ab', '#ffb38c']),
        preset('cyan', 'Cyan', ['#27c3e3', '#0c0b11', '#16141d', '#9a95ab', '#ff6fb1']),
        preset('lime', 'Lime', ['#b9e84b', '#0c0b11', '#16141d', '#9a95ab', '#ff6fb1']),
        preset('amber', 'Amber', ['#ff9a3d', '#0c0b11', '#16141d', '#9a95ab', '#ff6fb1']),
    ];

    // Chartreuse with ink labels (Auto) on a warm-white page: ink bands and footer, lilac-tint fills,
    // stone meta, lilac for the human handoff and Copilot (chartreuse in Lilac, whose primary is lilac)
    const AI_CHATBOT_1_PRESETS = [
        preset('chartreuse', 'Chartreuse', ['#cdf25c', '#131416', '#ece8ff', '#6c6b66', '#a99bff']),
        preset('mint', 'Mint', ['#62e0a8', '#131416', '#ece8ff', '#6c6b66', '#a99bff']),
        preset('sky', 'Sky', ['#7ec8ff', '#131416', '#ece8ff', '#6c6b66', '#a99bff']),
        preset('coral', 'Coral', ['#ff8d6e', '#131416', '#ece8ff', '#6c6b66', '#a99bff']),
        preset('lilac', 'Lilac', ['#b8a8ff', '#131416', '#ece8ff', '#6c6b66', '#cdf25c']),
    ];

    // Tangerine with white labels (the demo's choice, about 2.6:1) on warm white: ink bands and footer,
    // warm-white fills, stone meta, electric lime only on ink (tangerine in Lime, whose primary is lime);
    // Berry is #d83473 (spec #e23e7b) so its white label reaches 4.5:1
    const FITNESS_APP_1_PRESETS = [
        preset(
            'tangerine',
            'Tangerine',
            ['#ff7a45', '#121212', '#f7f5f2', '#77736d', '#d8ff3d'],
            ['primary'],
        ),
        preset('cobalt', 'Cobalt', ['#3757ff', '#121212', '#f7f5f2', '#77736d', '#d8ff3d']),
        preset('berry', 'Berry', ['#d83473', '#121212', '#f7f5f2', '#77736d', '#d8ff3d']),
        preset('lime', 'Lime', ['#9fd420', '#121212', '#f7f5f2', '#77736d', '#ff7a45']),
        preset(
            'teal',
            'Teal',
            ['#119a8a', '#121212', '#f7f5f2', '#77736d', '#d8ff3d'],
            ['primary'],
        ),
    ];

    // Dusk violet with white labels on a night-led page: indigo ground and footer, plum panels, mist meta,
    // moon cream for the moon, one word and the stars; Sage and Amber take ink labels; Dusk is #7a59fc
    // (spec #7c5cff) so its white label reaches 4.5:1
    const MEDITATION_APP_1_PRESETS = [
        preset('dusk', 'Dusk', ['#7a59fc', '#100e26', '#1c1838', '#a7a2c4', '#f6e7c8']),
        preset(
            'ocean',
            'Ocean',
            ['#3d8bff', '#100e26', '#1c1838', '#a7a2c4', '#f6e7c8'],
            ['primary'],
        ),
        preset(
            'rose',
            'Rose',
            ['#e86a9a', '#100e26', '#1c1838', '#a7a2c4', '#f6e7c8'],
            ['primary'],
        ),
        preset('sage', 'Sage', ['#7fbf9a', '#100e26', '#1c1838', '#a7a2c4', '#f6e7c8']),
        preset('amber', 'Amber', ['#f2a65a', '#100e26', '#1c1838', '#a7a2c4', '#f6e7c8']),
    ];

    // Mint with ink labels on white: green-ink buttons, bands and footer, mint-tint fills, moss meta, coral
    // for one status (mint in Coral, whose primary is coral); Butter takes ink labels
    const STARTUP_1_PRESETS = [
        preset('mint', 'Mint', ['#16c79a', '#0c1f1a', '#e8f8f2', '#5f6f69', '#ff7a59']),
        preset('indigo', 'Indigo', ['#5b5bf7', '#0c1f1a', '#e8f8f2', '#5f6f69', '#ff7a59']),
        preset(
            'coral',
            'Coral',
            ['#ff6b4a', '#0c1f1a', '#e8f8f2', '#5f6f69', '#16c79a'],
            ['primary'],
        ),
        preset('sky', 'Sky', ['#2fa8ff', '#0c1f1a', '#e8f8f2', '#5f6f69', '#ff7a59'], ['primary']),
        preset('butter', 'Butter', ['#f5c84b', '#0c1f1a', '#e8f8f2', '#5f6f69', '#ff7a59']),
    ];

    // Orange-red with white labels (the demo's choice, about 3.2:1) on warm white: charcoal bands and
    // footer, warm fills, slate meta, green for status lights only
    const IT_SERVICES_1_PRESETS = [
        preset(
            'ember',
            'Ember',
            ['#ff5630', '#16181d', '#f6f4f1', '#62666f', '#22c55e'],
            ['primary'],
        ),
        preset('azure', 'Azure', ['#2563eb', '#16181d', '#f6f4f1', '#62666f', '#22c55e']),
        preset(
            'emerald',
            'Emerald',
            ['#10a36a', '#16181d', '#f6f4f1', '#62666f', '#22c55e'],
            ['primary'],
        ),
        preset('violet', 'Violet', ['#7c4dff', '#16181d', '#f6f4f1', '#62666f', '#22c55e']),
        preset('graphite', 'Graphite', ['#2d3340', '#16181d', '#f6f4f1', '#62666f', '#22c55e']),
    ];

    // Azure with white labels (the demo's choice, about 3.8:1) on cool white: navy bands, menu and footer,
    // cool fills, steel meta, cyan for connectors and live nodes
    const SOFTWARE_DEV_1_PRESETS = [
        preset(
            'azure',
            'Azure',
            ['#2b7fff', '#0b1220', '#f4f6fa', '#5d6b82', '#38d6f0'],
            ['primary'],
        ),
        preset('indigo', 'Indigo', ['#4f46e5', '#0b1220', '#f4f6fa', '#5d6b82', '#38d6f0']),
        preset(
            'teal',
            'Teal',
            ['#0f9d8a', '#0b1220', '#f4f6fa', '#5d6b82', '#38d6f0'],
            ['primary'],
        ),
        preset(
            'orange',
            'Orange',
            ['#f26b1d', '#0b1220', '#f4f6fa', '#5d6b82', '#38d6f0'],
            ['primary'],
        ),
        preset('graphite', 'Graphite', ['#334155', '#0b1220', '#f4f6fa', '#5d6b82', '#38d6f0']),
    ];

    // Signal green with ink labels on a near-black page: graphite panels, fog meta, alert red for threats
    // only (amber in Red, whose primary is red); Violet pins white labels
    const CYBERSECURITY_1_PRESETS = [
        preset('signal', 'Signal', ['#00d68f', '#07090b', '#11161a', '#8b97a0', '#ff4d5e']),
        preset('cyan', 'Cyan', ['#22c7f0', '#07090b', '#11161a', '#8b97a0', '#ff4d5e']),
        preset(
            'violet',
            'Violet',
            ['#8b6cff', '#07090b', '#11161a', '#8b97a0', '#ff4d5e'],
            ['primary'],
        ),
        preset('amber', 'Amber', ['#ffb020', '#07090b', '#11161a', '#8b97a0', '#ff4d5e']),
        preset('red', 'Red', ['#ff4d5e', '#07090b', '#11161a', '#8b97a0', '#ffb020']),
    ];

    // Violet with white labels on paper: ink bands and footer, paper fills, graphite meta, red for critical
    // findings and the hotline dot, white labels (violet in Crimson, whose primary is red); Ochre takes ink
    // labels
    const SECURITY_SERVICES_1_PRESETS = [
        preset(
            'violet',
            'Violet',
            ['#6d4aff', '#111015', '#f6f5f2', '#5d5a66', '#e5484d'],
            ['accent'],
        ),
        preset('crimson', 'Crimson', ['#d6334a', '#111015', '#f6f5f2', '#5d5a66', '#6d4aff']),
        preset(
            'teal',
            'Teal',
            ['#0f8f87', '#111015', '#f6f5f2', '#5d5a66', '#e5484d'],
            ['primary', 'accent'],
        ),
        preset('navy', 'Navy', ['#2546b8', '#111015', '#f6f5f2', '#5d5a66', '#e5484d'], ['accent']),
        preset(
            'ochre',
            'Ochre',
            ['#c98a12', '#111015', '#f6f5f2', '#5d5a66', '#e5484d'],
            ['accent'],
        ),
    ];

    // Lime with ink labels on an ink page: graphite panels, ash meta, sky for latency and links in code
    // (lime in Sky, whose primary is sky); every preset takes ink labels
    const CLOUD_HOSTING_1_PRESETS = [
        preset('lime', 'Lime', ['#c4f25a', '#0a0b0d', '#14161a', '#8a9099', '#5ab8ff']),
        preset('sky', 'Sky', ['#5ab8ff', '#0a0b0d', '#14161a', '#8a9099', '#c4f25a']),
        preset('orange', 'Orange', ['#ff8a3d', '#0a0b0d', '#14161a', '#8a9099', '#5ab8ff']),
        preset('mint', 'Mint', ['#3ee6b0', '#0a0b0d', '#14161a', '#8a9099', '#5ab8ff']),
        preset('lilac', 'Lilac', ['#b39bff', '#0a0b0d', '#14161a', '#8a9099', '#5ab8ff']),
    ];

    // Sand with ink labels on paper: ink bands and footer, stone fills, graphite meta, paper as the accent;
    // Clay is #ad6344 (spec #b4694a) so its white label reaches 4.5:1
    const ARCHITECTURE_STUDIO_1_PRESETS = [
        preset('sand', 'Sand', ['#c5a47e', '#1b1d1a', '#eae7e0', '#6b6e68', '#f6f4ef']),
        preset('sage', 'Sage', ['#8a9b7c', '#1b1d1a', '#eae7e0', '#6b6e68', '#f6f4ef']),
        preset('clay', 'Clay', ['#ad6344', '#1b1d1a', '#eae7e0', '#6b6e68', '#f6f4ef']),
        preset('slate', 'Slate', ['#4f6273', '#1b1d1a', '#eae7e0', '#6b6e68', '#f6f4ef']),
        preset('ink', 'Ink', ['#2c2c2a', '#1b1d1a', '#eae7e0', '#6b6e68', '#f6f4ef']),
    ];

    // Bronze with ink labels on a charcoal page: lifted graphite panels, concrete meta, a warm light grey for
    // the one light band (bronze in Bone, whose primary is bone); Signal pins white labels
    const ARCHITECTURE_FIRM_1_PRESETS = [
        preset('bronze', 'Bronze', ['#b0946a', '#2a2a29', '#333331', '#9a978f', '#e6e3dd']),
        preset('citron', 'Citron', ['#d1c94b', '#2a2a29', '#333331', '#9a978f', '#e6e3dd']),
        preset('ice', 'Ice', ['#8fb8d6', '#2a2a29', '#333331', '#9a978f', '#e6e3dd']),
        preset(
            'signal',
            'Signal',
            ['#e8553a', '#2a2a29', '#333331', '#9a978f', '#e6e3dd'],
            ['primary'],
        ),
        preset('bone', 'Bone', ['#e3dccb', '#2a2a29', '#333331', '#9a978f', '#b0946a']),
    ];

    // Brass with ink labels on parchment: navy bands and footer, parchment fills, slate meta, deep teal as
    // the quiet accent (brass in Teal, whose primary is teal)
    const LAW_FIRM_1_PRESETS = [
        preset('brass', 'Brass', ['#b08d4f', '#13283a', '#f5f1ea', '#66707a', '#1f5a5c']),
        preset('oxblood', 'Oxblood', ['#7d2a32', '#13283a', '#f5f1ea', '#66707a', '#1f5a5c']),
        preset('teal', 'Teal', ['#1f6b68', '#13283a', '#f5f1ea', '#66707a', '#b08d4f']),
        preset('royal', 'Royal', ['#2e4fa0', '#13283a', '#f5f1ea', '#66707a', '#1f5a5c']),
        preset('graphite', 'Graphite', ['#4a4a4a', '#13283a', '#f5f1ea', '#66707a', '#1f5a5c']),
    ];

    // Clinic blue with white labels on white: navy topbar, bands and footer, pale-blue fills, slate meta,
    // mint for availability (clinic blue in Green, whose primary is green); Teal is #008481 (spec #0f8a86)
    // and Green #288652 (spec #2e8b57) so their white labels reach 4.5:1
    const MEDICAL_CLINIC_1_PRESETS = [
        preset('clinic-blue', 'Clinic Blue', [
            '#2251a8',
            '#0e2340',
            '#eef3f9',
            '#5c6b7e',
            '#43c59e',
        ]),
        preset('teal', 'Teal', ['#008481', '#0e2340', '#eef3f9', '#5c6b7e', '#43c59e']),
        preset('green', 'Green', ['#288652', '#0e2340', '#eef3f9', '#5c6b7e', '#2251a8']),
        preset('indigo', 'Indigo', ['#4a4fb8', '#0e2340', '#eef3f9', '#5c6b7e', '#43c59e']),
        preset('berry', 'Berry', ['#b03a6a', '#0e2340', '#eef3f9', '#5c6b7e', '#43c59e']),
    ];

    // Rose wine with white labels on blush cream: wine-ink bands and footer, cream fills, mauve-grey meta,
    // blush for line art (rose wine in Blush, whose primary is blush); mauve grey is #827275 (spec
    // #8a7a7d), Lavender #816aae (spec #8a73b8) so its white label reaches 4.5:1; Blush takes ink labels
    const BEAUTY_SALON_1_PRESETS = [
        preset('rose-wine', 'Rose Wine', ['#8e3b4f', '#2a1419', '#f6efe9', '#827275', '#e9c4c0']),
        preset('blush', 'Blush', ['#d98c8c', '#2a1419', '#f6efe9', '#827275', '#8e3b4f']),
        preset('mocha', 'Mocha', ['#7a5a48', '#2a1419', '#f6efe9', '#827275', '#e9c4c0']),
        preset('lavender', 'Lavender', ['#816aae', '#2a1419', '#f6efe9', '#827275', '#e9c4c0']),
        preset('emerald', 'Emerald', ['#2f7a5e', '#2a1419', '#f6efe9', '#827275', '#e9c4c0']),
    ];

    // Coral with ink labels on blush: deep-teal bands and footer, blush fills, stone meta, sand for steam
    // lines; stone is #7f746e (spec #8a7f78), Clay #b06146 (spec #b5664b) so its white label reaches 4.5:1;
    // Sage takes ink labels
    const SPA_1_PRESETS = [
        preset('coral', 'Coral', ['#e0866a', '#0b3a40', '#f6ece6', '#7f746e', '#e8d3b8']),
        preset('sage', 'Sage', ['#7f9a7a', '#0b3a40', '#f6ece6', '#7f746e', '#e8d3b8']),
        preset('clay', 'Clay', ['#b06146', '#0b3a40', '#f6ece6', '#7f746e', '#e8d3b8']),
        preset('plum', 'Plum', ['#7a4e6e', '#0b3a40', '#f6ece6', '#7f746e', '#e8d3b8']),
        preset('ocean', 'Ocean', ['#2e6f8e', '#0b3a40', '#f6ece6', '#7f746e', '#e8d3b8']),
    ];

    // Nude and rose clay: a dusty rose with white labels on a pale nude, a warm brown-black ink for the text,
    // topbar, bands and footer, a taupe for meta, blush for the light leaks. The neutrals derive from the
    // seeds (theme), so each preset retints the panels and lines too. White labels read at 4.5:1 or more on every fill
    const SKIN_CLINIC_1_PRESETS = [
        preset('nude', 'Nude', ['#a3675b', '#2a2220', '#f7f0ec', '#82736e', '#e9c2b8']),
        preset('mocha', 'Mocha', ['#8a6650', '#2b231e', '#f6f0ea', '#7e746c', '#dcc3ae']),
        preset('sage', 'Sage', ['#5e7b65', '#1e2a23', '#f5f2ec', '#717872', '#c8b07f']),
        preset('ocean', 'Ocean', ['#3f6f8f', '#16242e', '#f2f3f1', '#6c7781', '#c8b07f']),
        preset('plum', 'Plum', ['#7a4f6e', '#241a22', '#f5f1f0', '#787075', '#c9a27e']),
    ];

    // Lime #d6fb00 with ink labels on a near-black page (dark by design): bone for the one light band,
    // graphite panels, chalk for tallies; Volt (#ffd60a, warmer than the lime so the two differ) and Ice take
    // ink labels too, Ember pins white; Red is #df3038 (spec #e3343b) so its white label reaches 4.5:1
    const GYM_1_PRESETS = [
        preset('lime', 'Lime', ['#d6fb00', '#0e0f0d', '#efeee8', '#4a4d47', '#f7f7f3']),
        preset('volt', 'Volt', ['#ffd60a', '#0e0f0d', '#efeee8', '#4a4d47', '#f7f7f3']),
        preset(
            'ember',
            'Ember',
            ['#ff5a2c', '#0e0f0d', '#efeee8', '#4a4d47', '#f7f7f3'],
            ['primary'],
        ),
        preset('ice', 'Ice', ['#3fb6e6', '#0e0f0d', '#efeee8', '#4a4d47', '#f7f7f3']),
        preset('red', 'Red', ['#df3038', '#0e0f0d', '#efeee8', '#4a4d47', '#f7f7f3']),
    ];

    const YOGA_STUDIO_1_PRESETS = [
        preset('pine', 'Pine', ['#4e7a62', '#1f3229', '#f4efe6', '#b98a6a', '#e7dccb']),
        preset('clay', 'Clay', ['#a56640', '#1f3229', '#f4efe6', '#b98a6a', '#e7dccb']),
        preset('lilac', 'Lilac', ['#816d9f', '#1f3229', '#f4efe6', '#b98a6a', '#e7dccb']),
        preset('ocean', 'Ocean', ['#3f7690', '#1f3229', '#f4efe6', '#b98a6a', '#e7dccb']),
        preset('sand', 'Sand', ['#c4a072', '#1f3229', '#f4efe6', '#b98a6a', '#e7dccb']),
    ];

    // Dusty mauve with white labels on porcelain: plum-ink bands and footer, porcelain fills, stone meta,
    // blush for soft panels; Mauve is #906a88 (spec #9c7694), Clay #a9644d (spec #b8715a) and stone #7e7378
    // (spec #8d8287) so their white labels reach 4.5:1; Sage and Rose take ink labels
    const PILATES_1_PRESETS = [
        preset('mauve', 'Mauve', ['#906a88', '#2a1f29', '#f6f2f0', '#7e7378', '#ead9dd']),
        preset('sage', 'Sage', ['#7c9483', '#2a1f29', '#f6f2f0', '#7e7378', '#ead9dd']),
        preset('clay', 'Clay', ['#a9644d', '#2a1f29', '#f6f2f0', '#7e7378', '#ead9dd']),
        preset('ink', 'Ink', ['#3d3a48', '#2a1f29', '#f6f2f0', '#7e7378', '#ead9dd']),
        preset('rose', 'Rose', ['#c27c8e', '#2a1f29', '#f6f2f0', '#7e7378', '#ead9dd']),
    ];

    // Red #ea191d (asked #eb191d, one step deeper so white reaches 4.5:1) with white labels on bone:
    // black stage, bands and footer, bone fills, warm-grey meta, spotlight for glows; Violet stands in
    // for Magenta (too near the red), Teal is #008574 (spec #14907e), Gold is ochre #c98a14, pinned white
    const DANCE_STUDIO_1_PRESETS = [
        preset('red', 'Red', ['#ea191d', '#111010', '#f3efe8', '#77706a', '#ffd9b8']),
        preset('violet', 'Violet', ['#7444d8', '#111010', '#f3efe8', '#77706a', '#ffd9b8']),
        preset('cobalt', 'Cobalt', ['#3a5bd9', '#111010', '#f3efe8', '#77706a', '#ffd9b8']),
        preset('teal', 'Teal', ['#008574', '#111010', '#f3efe8', '#77706a', '#ffd9b8']),
        preset(
            'gold',
            'Gold',
            ['#c98a14', '#111010', '#f3efe8', '#77706a', '#ffd9b8'],
            ['primary'],
        ),
    ];

    // Claret with white labels on ivory: charcoal topbar, bands and footer, ivory menu cards, taupe meta,
    // brass for small details (claret in Brass, whose primary is brass); taupe is #7f7368 (spec #8b7f74);
    // Brass takes ink labels
    const RESTAURANT_1_PRESETS = [
        preset('claret', 'Claret', ['#9e2a33', '#191514', '#f6f1e8', '#7f7368', '#b8955e']),
        preset('forest', 'Forest', ['#2f5a46', '#191514', '#f6f1e8', '#7f7368', '#b8955e']),
        preset('brass', 'Brass', ['#b58c4f', '#191514', '#f6f1e8', '#7f7368', '#9e2a33']),
        preset('ink', 'Ink', ['#2b3448', '#191514', '#f6f1e8', '#7f7368', '#b8955e']),
        preset('terracotta', 'Terracotta', ['#b5532f', '#191514', '#f6f1e8', '#7f7368', '#b8955e']),
    ];

    // Honey amber with white labels on cream (pinned on Honey and Pistachio, the other three are white
    // by Auto): espresso bands and footer, cream fills, crust for stamps, butter for chips; crust is
    // #a66838 (spec #a8693a), Tomato #d2452a (spec #d4472c)
    const CAFE_1_PRESETS = [
        preset(
            'honey',
            'Honey',
            ['#d8952a', '#2b1c14', '#f8f1e4', '#a66838', '#f3d9a4'],
            ['primary'],
        ),
        preset('tomato', 'Tomato', ['#d2452a', '#2b1c14', '#f8f1e4', '#a66838', '#f3d9a4']),
        preset(
            'pistachio',
            'Pistachio',
            ['#7f9a4e', '#2b1c14', '#f8f1e4', '#a66838', '#f3d9a4'],
            ['primary'],
        ),
        preset('berry', 'Berry', ['#a63d5a', '#2b1c14', '#f8f1e4', '#a66838', '#f3d9a4']),
        preset('cocoa', 'Cocoa', ['#7a4e35', '#2b1c14', '#f8f1e4', '#a66838', '#f3d9a4']),
    ];

    // Sand bronze with white labels (pinned where Auto would pick ink) on shell: lagoon-ink bands and footer, shell
    // fills, driftwood meta, sea glass for the tide line and map water; driftwood is #817465 (spec #8e8172)
    const RESORT_1_PRESETS = [
        preset(
            'sand',
            'Sand',
            ['#b2905d', '#0f2f33', '#f5f0e7', '#817465', '#a9cfc8'],
            ['primary'],
        ),
        preset('lagoon', 'Lagoon', ['#1f7c86', '#0f2f33', '#f5f0e7', '#817465', '#a9cfc8']),
        preset(
            'coral',
            'Coral',
            ['#d9785b', '#0f2f33', '#f5f0e7', '#817465', '#a9cfc8'],
            ['primary'],
        ),
        preset('palm', 'Palm', ['#4f7a4d', '#0f2f33', '#f5f0e7', '#817465', '#a9cfc8']),
        preset('dusk', 'Dusk', ['#5d5689', '#0f2f33', '#f5f0e7', '#817465', '#a9cfc8']),
    ];

    // Industrial red with white labels on concrete: steel-black nav, bands and footer, steel meta, signal
    // white for marks; Orange pins white (Auto picks ink), Yellow takes ink labels
    const FACTORY_1_PRESETS = [
        preset('red', 'Red', ['#d42a20', '#15171a', '#eeeeeb', '#5b636b', '#fafaf8']),
        preset(
            'orange',
            'Orange',
            ['#ec6a1f', '#15171a', '#eeeeeb', '#5b636b', '#fafaf8'],
            ['primary'],
        ),
        preset('blue', 'Blue', ['#1f5fbf', '#15171a', '#eeeeeb', '#5b636b', '#fafaf8']),
        preset(
            'yellow',
            'Yellow',
            ['#f2b705', '#15171a', '#eeeeeb', '#5b636b', '#fafaf8'],
            ['primary'],
        ),
        preset('steel', 'Steel', ['#4d6577', '#15171a', '#eeeeeb', '#5b636b', '#fafaf8']),
    ];

    // Leaf green with white labels (pinned where Auto would pick ink) on white: evergreen bands and footer,
    // sage paper panels, slate meta, sun for the sun path; Sun takes ink labels;
    // Teal is #0c837b (spec #0e8f86) so its white label reaches 4.5:1
    const SOLAR_ENERGY_1_PRESETS = [
        preset(
            'leaf',
            'Leaf',
            ['#22a447', '#0f2a1d', '#f3f7f1', '#56645a', '#ffc23d'],
            ['primary'],
        ),
        preset('sun', 'Sun', ['#f2a900', '#0f2a1d', '#f3f7f1', '#56645a', '#ffc23d'], ['primary']),
        preset('sky', 'Sky', ['#1e88e5', '#0f2a1d', '#f3f7f1', '#56645a', '#ffc23d'], ['primary']),
        preset('teal', 'Teal', ['#0c837b', '#0f2a1d', '#f3f7f1', '#56645a', '#ffc23d']),
        preset(
            'coral',
            'Coral',
            ['#ea5a3a', '#0f2a1d', '#f3f7f1', '#56645a', '#ffc23d'],
            ['primary'],
        ),
    ];

    // Forest with white labels, dark-led: forest-ink grounds and footer, bone bands, moss meta, mint for the
    // wind lines; Sun takes ink labels; Clay is #b25e3b (spec #b5603d) so its white label reaches 4.5:1
    const RENEWABLE_ENERGY_1_PRESETS = [
        preset('forest', 'Forest', ['#1f7a4c', '#0c1a13', '#f2f1ea', '#4f6b5a', '#b9efcf']),
        preset('ocean', 'Ocean', ['#1f6fa8', '#0c1a13', '#f2f1ea', '#4f6b5a', '#b9efcf']),
        preset('sun', 'Sun', ['#e0a526', '#0c1a13', '#f2f1ea', '#4f6b5a', '#b9efcf'], ['primary']),
        preset('teal', 'Teal', ['#13857a', '#0c1a13', '#f2f1ea', '#4f6b5a', '#b9efcf']),
        preset('clay', 'Clay', ['#b25e3b', '#0c1a13', '#f2f1ea', '#4f6b5a', '#b9efcf']),
    ];

    // Safety orange with white labels (pinned where Auto would pick ink) on white: ink bands and footer,
    // concrete panels, steel meta, hi-vis for tiny accents; Hi-Vis takes ink labels
    const CONSTRUCTION_1_PRESETS = [
        preset(
            'safety',
            'Safety',
            ['#f5781f', '#15171b', '#efeeeb', '#62676f', '#ffd23f'],
            ['primary'],
        ),
        preset(
            'hi-vis',
            'Hi-Vis',
            ['#f5b700', '#15171b', '#efeeeb', '#62676f', '#ffd23f'],
            ['primary'],
        ),
        preset('red', 'Red', ['#d63a2f', '#15171b', '#efeeeb', '#62676f', '#ffd23f']),
        preset('blue', 'Blue', ['#1d5fae', '#15171b', '#efeeeb', '#62676f', '#ffd23f']),
        preset('green', 'Green', ['#2f8a4c', '#15171b', '#efeeeb', '#62676f', '#ffd23f']),
    ];

    // Site-safety orange with white labels: deep-navy headings, text, bands and footer, cool off-white grounds,
    // slate meta, apricot marks on navy; every preset pins white labels on the primary, Brick keeps the first
    // terracotta-on-charcoal look
    const CONSTRUCTION_2_PRESETS = [
        preset(
            'orange',
            'Orange',
            ['#f45b14', '#0a2457', '#eef1f5', '#66707f', '#ffbf8f'],
            ['primary'],
        ),
        preset(
            'yellow',
            'Yellow',
            ['#e9a209', '#0c1f45', '#f1f3f6', '#667080', '#ffd47a'],
            ['primary'],
        ),
        preset('red', 'Red', ['#d42a2f', '#1b1d22', '#f1f1f3', '#6b6e75', '#f7b3a8']),
        preset(
            'teal',
            'Teal',
            ['#0e958a', '#0b2240', '#edf3f4', '#62717a', '#9fe0d4'],
            ['primary'],
        ),
        preset('brick', 'Brick', ['#b4472a', '#1d2023', '#efece6', '#6f6a63', '#d8b98a']),
    ];

    // Electric azure with white labels on a cool blue-grey page: navy-ink frames, bands and footer, ice-blue
    // fills and lights, slate meta, amber for ratings only; Graphite's near-grey primary hands the frame fills
    // to its blue tertiary
    const CORPORATE_2_PRESETS = [
        preset('blue', 'Blue', ['#1f6bff', '#0a1530', '#9cc4ff', '#5f6b80', '#f2b544']),
        preset('ocean', 'Ocean', ['#0b7fa6', '#061c26', '#8fd3ea', '#5c6f78', '#f2b544']),
        preset('indigo', 'Indigo', ['#4f46e5', '#110f2e', '#b0abff', '#666480', '#f2b544']),
        preset('graphite', 'Graphite', ['#2b3138', '#0f1216', '#8fb4ff', '#6b7178', '#f2b544']),
        preset('emerald', 'Emerald', ['#0d845d', '#061f18', '#8fdcc0', '#5d6f68', '#f2b544']),
    ];

    // Indigo with white labels on white and a lavender tint: ink-navy bands and footer, periwinkle fills, slate
    // meta, gold for stars; Teal pins white labels
    const CORPORATE_3_PRESETS = [
        preset('indigo', 'Indigo', ['#5b54e8', '#161a33', '#a7a4f5', '#646a80', '#f6a623']),
        preset('cobalt', 'Cobalt', ['#2459e0', '#0f1b3a', '#8fb0ff', '#5f6b85', '#f6a623']),
        preset('violet', 'Violet', ['#7b3fe4', '#1c1233', '#c7a6ff', '#6c6680', '#f6a623']),
        preset(
            'teal',
            'Teal',
            ['#0f8f8a', '#0b2326', '#7fd1c9', '#5d7374', '#f6a623'],
            ['primary'],
        ),
        preset('ink', 'Ink', ['#2a2f45', '#111426', '#8d89f2', '#6b7080', '#f6a623']),
    ];

    // Burnt orange with white labels on warm paper: charcoal bands and footer, peach fills, warm-grey meta, a
    // blue for chart links; Ember and Saffron pin white labels; the orange accent of Moss and Blue is #e6652f
    // (spec #e4602b) so its dark label reaches 4.5:1
    const CORPORATE_4_PRESETS = [
        preset(
            'ember',
            'Ember',
            ['#e4602b', '#24252c', '#f3b58f', '#77716b', '#2f6fdf'],
            ['primary'],
        ),
        preset('crimson', 'Crimson', ['#c8323c', '#231c1e', '#eea3a6', '#76696b', '#2f6fdf']),
        preset(
            'saffron',
            'Saffron',
            ['#d98d14', '#25221c', '#f2c97c', '#78705f', '#2f6fdf'],
            ['primary'],
        ),
        preset('moss', 'Moss', ['#4f7d3a', '#1e231b', '#b3d39c', '#6c7266', '#e6652f']),
        preset('blue', 'Blue', ['#2f62d9', '#1d2230', '#9fb8f2', '#6b7180', '#e6652f']),
    ];

    // Forest green with white labels on white and soft grey: obsidian and deep-forest bands, an electric spark (the
    // tertiary, dark labels) for key words, the ring and one fill on dark grounds, warm-grey meta
    const CORPORATE_5_PRESETS = [
        preset('forest', 'Forest', ['#1a5543', '#181519', '#03ff93', '#6c6a68', '#03ff93']),
        preset('teal', 'Teal', ['#0e5560', '#121a1d', '#3fe0d0', '#666b6d', '#3fe0d0']),
        preset('navy', 'Navy', ['#1c3a6b', '#13151c', '#5cc4ff', '#676a72', '#5cc4ff']),
        preset('plum', 'Plum', ['#57264f', '#181317', '#ff86c8', '#6d6669', '#ff86c8']),
        preset('ink', 'Ink', ['#27262b', '#121115', '#03ff93', '#6b6870', '#03ff93']),
    ];

    // Ultramarine with white labels on white and a cool mist: ink text and bands, periwinkle fills, slate meta,
    // amber for ratings only; Graphite's near-grey primary hands the brand fills to its periwinkle tertiary
    const CORPORATE_6_PRESETS = [
        preset('ultramarine', 'Ultramarine', [
            '#1640ee',
            '#11131a',
            '#c9d3ff',
            '#5d6474',
            '#f2b544',
        ]),
        preset('navy', 'Navy', ['#1b2f5e', '#0d1322', '#c8d3ec', '#5e6677', '#f2b544']),
        preset('teal', 'Teal', ['#0f7f7a', '#0c1c1c', '#bfe3df', '#5b6c6b', '#f2b544']),
        preset('burgundy', 'Burgundy', ['#8e1f3d', '#1c1116', '#f0c3cf', '#6f6267', '#d9a441']),
        preset('graphite', 'Graphite', ['#2a2d34', '#111216', '#9aa6ff', '#666a73', '#f2b544']),
    ];

    // Emerald with white labels on white and mist green: deep pine-slate text, bands and hero veil, mint fills,
    // grey-green meta, amber for ratings only
    const CORPORATE_7_PRESETS = [
        preset('emerald', 'Emerald', ['#2fa266', '#14231f', '#a9dcc0', '#5e6d67', '#e8b04a']),
        preset('forest', 'Forest', ['#1f6f4a', '#0f1d17', '#a5d1b9', '#5d6b64', '#e8b04a']),
        preset('cobalt', 'Cobalt', ['#2563d6', '#101b2e', '#a9c3f2', '#5f6a7c', '#e8b04a']),
        preset('slate', 'Slate', ['#3b5568', '#121a20', '#a7bccb', '#66707a', '#2fa266']),
        preset('copper', 'Copper', ['#b8612e', '#1f1712', '#e9bc9d', '#736a63', '#2fa266']),
    ];

    // Tangerine with white labels on warm white: aubergine text, bands and topbar, peach fills, mauve-grey meta,
    // sunflower for ratings only
    const CONSULTING_2_PRESETS = [
        preset('tangerine', 'Tangerine', ['#ff6a1f', '#372b5e', '#ffc29f', '#6f6680', '#ffd166']),
        preset('coral', 'Coral', ['#f0524f', '#2b2347', '#ffb3ae', '#6d6680', '#ffd166']),
        preset('teal', 'Teal', ['#0f9b8e', '#1d2a44', '#9fe0d7', '#5f6b7c', '#ff6a1f']),
        preset('magenta', 'Magenta', ['#d63384', '#2a1a3a', '#f4a8cd', '#6e6276', '#ffd166']),
        preset('sky', 'Sky', ['#2b7de9', '#1b2440', '#a9cbf7', '#626b80', '#ff6a1f']),
    ];

    // Coral with white labels on white and pale blue-grey: navy text, topbar and structure, blush fills, slate
    // meta, amber for ratings only; Sage and Ink pin white labels on their coral accent
    const CONSULTING_3_PRESETS = [
        preset('coral', 'Coral', ['#e9485c', '#173a6b', '#f7b3bc', '#5f6b7d', '#f4b740']),
        preset('ocean', 'Ocean', ['#1f7ac2', '#132d4f', '#a9d0ef', '#5e6b7c', '#f4b740']),
        preset('plum', 'Plum', ['#8b3f8f', '#2a1f45', '#dcb0de', '#6b6478', '#f4b740']),
        preset('sage', 'Sage', ['#4e8a5f', '#1d3328', '#b6d8bf', '#617066', '#e9485c'], ['accent']),
        preset('ink', 'Ink', ['#2d3442', '#141a26', '#f08c99', '#666d7a', '#e9485c'], ['accent']),
    ];

    // Crimson with white labels on newsprint: ink text and rules, warm-grey bylines, amber for one live highlight
    const NEWS_1_PRESETS = [
        preset('crimson', 'Crimson', ['#d4203f', '#121418', '#f6f4ef', '#6a6760', '#e8a33d']),
        preset('navy', 'Navy', ['#1d3f8f', '#0f1422', '#f3f4f6', '#646a76', '#d4203f']),
        preset('forest', 'Forest', ['#1f6b4a', '#111a16', '#f3f4ef', '#636a64', '#d4203f']),
        preset('ink', 'Ink', ['#2a2c31', '#0e0f12', '#f5f4f0', '#68686a', '#d4203f']),
        preset('orange', 'Orange', ['#e0561c', '#17140f', '#f7f2ea', '#6d675e', '#1d6fd6']),
    ];

    // Espresso with white labels on warm white: a pale-lime cover panel with ink labels, warm-grey meta, terracotta for
    // one highlight; Espresso and Olive pin white labels on their terracotta accent
    const MAGAZINE_1_PRESETS = [
        preset(
            'espresso',
            'Espresso',
            ['#2f2620', '#1c1612', '#e6f5b0', '#766b61', '#d9653b'],
            ['accent'],
        ),
        preset(
            'olive',
            'Olive',
            ['#3e4a2a', '#181c12', '#f3e6b8', '#6c6f60', '#d9653b'],
            ['accent'],
        ),
        preset('plum', 'Plum', ['#4a2540', '#1b1219', '#f6d2df', '#73656e', '#e0a33a']),
        preset('navy', 'Navy', ['#1f2a44', '#11161f', '#cfe4f5', '#666c78', '#e0653b']),
        preset('terracotta', 'Terracotta', ['#9a3f24', '#1f1410', '#f7e3c5', '#766a62', '#2f5d50']),
    ];

    // Terracotta with white labels on cream: cocoa text, sand fills, warm-grey meta, sage for one tag colour;
    // Terracotta pins white labels on its sage accent, Ochre on its primary (white labels on every brand fill)
    const BLOG_1_PRESETS = [
        preset(
            'terracotta',
            'Terracotta',
            ['#c2774f', '#2b211b', '#f1dccb', '#7a6c62', '#6f8f6a'],
            ['accent'],
        ),
        preset('sage', 'Sage', ['#5f7f5a', '#1f241c', '#dfe8d6', '#6d7268', '#c2774f']),
        preset('rose', 'Rose', ['#b5576b', '#2a1b20', '#f2d9dd', '#786a6e', '#c99a4a']),
        preset('blue', 'Blue', ['#3f6fa8', '#1a2230', '#d9e4f1', '#6a707a', '#c2774f']),
        preset(
            'ochre',
            'Ochre',
            ['#b8862e', '#2a2117', '#f2e3c2', '#776d60', '#5a7a55'],
            ['primary'],
        ),
    ];

    // Coral-magenta with white labels on white: night text and scrims, blush fills, slate meta, sun yellow for one highlight;
    // Sunset pins white labels on its blue accent
    const TRAVEL_BLOG_1_PRESETS = [
        preset('magenta', 'Magenta', ['#e5406a', '#0f1720', '#ffd3dc', '#677180', '#ffb03b']),
        preset('ocean', 'Ocean', ['#1677c9', '#0d1724', '#cfe5f7', '#647181', '#ff8a3d']),
        preset('jungle', 'Jungle', ['#1e8a5a', '#0e1a15', '#cdebdc', '#63716a', '#ffb03b']),
        preset(
            'sunset',
            'Sunset',
            ['#f2662d', '#1c1210', '#ffd9c6', '#74685f', '#2a8fd6'],
            ['accent'],
        ),
        preset('violet', 'Violet', ['#7b4fe0', '#14111f', '#e0d5fb', '#6c6879', '#ffb03b']),
    ];

    // Electric violet with white labels on near-black (dark by design): graphite tiles, lilac-mist meta, mint for deals
    const TECH_BLOG_1_PRESETS = [
        preset('violet', 'Violet', ['#6b4cff', '#0b0b10', '#16151f', '#a29db8', '#3ddc97']),
        preset('blue', 'Blue', ['#3d63ff', '#0a0c12', '#141722', '#9da3b8', '#ffb02e']),
        preset('magenta', 'Magenta', ['#d02f8f', '#0d0a0f', '#1a1520', '#a89cae', '#3ddc97']),
        preset('emerald', 'Emerald', ['#119c66', '#090d0b', '#131a17', '#98aaa1', '#b388ff']),
        preset('orange', 'Orange', ['#e8551c', '#0d0b0a', '#1a1614', '#ada39c', '#8b74ff']),
    ];

    // Azure with white labels on white and sky tint: navy text, topbar and bands, sky fills, slate meta, amber for ratings
    const AUTO_SERVICES_1_PRESETS = [
        preset('azure', 'Azure', ['#1f6fe6', '#0c1a33', '#d4e4fb', '#5e6a7c', '#f5b301']),
        preset('red', 'Red', ['#d42a2a', '#1a1214', '#f7d4d4', '#6e6467', '#f5b301']),
        preset('green', 'Green', ['#14915a', '#0e1d17', '#cdeadb', '#5f6d66', '#f5b301']),
        preset('orange', 'Orange', ['#ea6a12', '#1c1612', '#fbdcc4', '#71675f', '#f5b301']),
        preset('graphite', 'Graphite', ['#2e3440', '#111318', '#d9dde5', '#646a75', '#f5b301']),
    ];

    // Ocean navy with white labels on white: ink text and topbar, mist-blue fills, slate meta, signal amber for the route
    // dot and small highlights (ink labels on it)
    const LOGISTICS_1_PRESETS = [
        preset('ocean', 'Ocean', ['#0d2a5c', '#0a1424', '#d5e0f2', '#5d6878', '#ffb21c']),
        preset('teal', 'Teal', ['#0b5d6b', '#081a1e', '#cbe6e8', '#5c6b6e', '#ffb21c']),
        preset('red', 'Red', ['#c22a2f', '#17111a', '#f4d1d2', '#6c6468', '#ffb21c']),
        preset('blue', 'Blue', ['#1659d6', '#0b1426', '#d2e1fa', '#5f6a7c', '#ff7a1c']),
        preset('forest', 'Forest', ['#1d5a3c', '#0c1913', '#cfe5d8', '#5f6c65', '#ffb21c']),
    ];

    // Caramel with white labels on warm stone: charcoal text and dark bands, stone fills, warm-grey meta, smoked green-grey
    // kept as the accent seed
    const CITY_HOTEL_1_PRESETS = [
        preset('caramel', 'Caramel', ['#ad7a52', '#1b1917', '#e8e1d7', '#75706a', '#3f4a44']),
        preset('brass', 'Brass', ['#9a7d48', '#141414', '#e5e2dc', '#6f6d68', '#3f4a44']),
        preset('olive', 'Olive', ['#6c7150', '#1a1b16', '#e3e2d6', '#6e6e63', '#86593a']),
        preset('navy', 'Navy', ['#2f4763', '#12171e', '#dde2e8', '#68707a', '#86593a']),
        preset('terracotta', 'Terracotta', ['#ad5a3c', '#1d1714', '#eaded5', '#766b65', '#3f4a44']),
    ];

    // Olive with white labels on stone: ink text, stone panels, warm-grey meta, brass for hairlines and the badge
    const APARTHOTEL_1_PRESETS = [
        preset('clay', 'Clay', ['#a65a3a', '#231914', '#efdccf', '#776b63', '#b8945e']),
        preset('olive', 'Olive', ['#5f6d45', '#1d2118', '#e6e2d4', '#6d6f65', '#b8945e']),
        preset('slate', 'Slate', ['#3f566b', '#151b22', '#d9e0e7', '#666d75', '#b8945e']),
        preset('charcoal', 'Charcoal', ['#33332f', '#121211', '#e3e1da', '#6c6b66', '#b8945e']),
        preset('teal', 'Teal', ['#2f6e6a', '#11201f', '#d3e6e3', '#646f6d', '#c9a46a']),
    ];

    // Lime with black labels (neon) on black (dark by design): graphite panels, warm-grey captions, bone for one light fill;
    // every alternative stays bright enough for black labels
    const PHOTOGRAPHER_1_PRESETS = [
        preset('lime', 'Lime', ['#d2f23a', '#0a0a0a', '#161616', '#8f8d86', '#ecebe6']),
        preset('yellow', 'Yellow', ['#f5d33a', '#0b0a08', '#171512', '#928d82', '#ecebe6']),
        preset('aqua', 'Aqua', ['#4fe3c1', '#080b0b', '#141818', '#8a918f', '#ecebe6']),
        preset('orange', 'Orange', ['#ff8a3d', '#0b0908', '#181412', '#958c84', '#ecebe6']),
        preset('bone', 'Bone', ['#ecebe6', '#0a0a0a', '#161616', '#8f8d86', '#d2f23a']),
    ];

    // Blue with white labels on a pale blue wash: ink text, pale blue fills, blue-grey meta, apricot for one card ground;
    // Ink pins white labels on its emerald accent
    const PRODUCT_DESIGNER_1_PRESETS = [
        preset('blue', 'Blue', ['#2f6bf0', '#121a2b', '#d3e0fb', '#606a7c', '#f59e4a']),
        preset('emerald', 'Emerald', ['#169b62', '#13201a', '#cdebdb', '#5f6d66', '#f59e4a']),
        preset('violet', 'Violet', ['#7451e0', '#191428', '#e0d7fa', '#6a6679', '#f59e4a']),
        preset('coral', 'Coral', ['#ec5b45', '#24140f', '#fbd6cf', '#776863', '#2f9e7a']),
        preset('ink', 'Ink', ['#26302b', '#0f1411', '#d9e6df', '#66706b', '#169b62'], ['accent']),
    ];

    // Tangerine with white labels on forest and cream: forest grounds and text, peach fills, grey-green meta, butter yellow for
    // one highlight
    const DEVELOPER_1_PRESETS = [
        preset('blue', 'Blue', ['#2f6bff', '#10213f', '#cfdcff', '#5f6879', '#ff6f2c']),
        preset(
            'tangerine',
            'Tangerine',
            ['#ff6f2c', '#123528', '#ffd2bb', '#5f6a63', '#ffd166'],
            ['primary'],
        ),
        preset(
            'pink',
            'Pink',
            ['#ec3f8c', '#2a1030', '#fbcfe2', '#6d6274', '#ffd166'],
            ['primary'],
        ),
        preset(
            'green',
            'Green',
            ['#1f9d55', '#0f2a3a', '#c9edd8', '#5e6b70', '#ff6f2c'],
            ['primary'],
        ),
        preset('red', 'Red', ['#e23b2e', '#1a1a1a', '#f8d0cc', '#6b6b6b', '#ffd166']),
    ];

    // Sunflower with white labels (brand-fill rule) on paper white: ink text, butter fills, warm-grey meta, coral for one sticker
    const ILLUSTRATOR_1_PRESETS = [
        preset('sunflower', 'Sunflower', ['#ffcf1a', '#151515', '#fff0b3', '#6e6a63', '#ff5b4a']),
        preset('coral', 'Coral', ['#ff6b57', '#1a1514', '#ffd7cf', '#736967', '#2f6fe0']),
        preset('blue', 'Blue', ['#2f6fe0', '#121722', '#d3e1fa', '#666c78', '#ffcf1a']),
        preset('green', 'Green', ['#2fb36b', '#121a15', '#cdeedb', '#636d67', '#ff6b57']),
        preset('pink', 'Pink', ['#f05aa0', '#1d1219', '#fcd3e6', '#736770', '#ffcf1a']),
    ];

    // Crimson red with white labels on paper: ink text, blush fills, warm-grey meta, amber for one award mark
    const CREATIVE_DIRECTOR_1_PRESETS = [
        preset('crimson', 'Crimson', ['#d3163b', '#141313', '#f4cfd5', '#6d6a66', '#ff9a1f']),
        preset('blue', 'Blue', ['#1f4fe0', '#10131c', '#d2dcfa', '#666b77', '#ff9a1f']),
        preset('black', 'Black', ['#1a1a1a', '#0b0b0b', '#e3e1dd', '#6b6966', '#d3163b']),
        preset('orange', 'Orange', ['#f05514', '#171210', '#fcd6c4', '#736962', '#1f4fe0']),
        preset('green', 'Green', ['#0f7a52', '#0d1712', '#cbe5d8', '#606b65', '#ff9a1f']),
    ];

    // Iris with white labels on cool off-white (round 100, 2026-10-26): ink text, the project stage and the overlay panel,
    // off-white fills, grey-violet meta, aqua for the availability dot and small marks (Auto, black); Emerald pins white on
    // its primary (brand-fill rule)
    const MOTION_DESIGNER_1_PRESETS = [
        preset('iris', 'Iris', ['#5a46ff', '#0e0d14', '#f3f2f7', '#6b6977', '#3ee0c5']),
        preset('cobalt', 'Cobalt', ['#1f5bff', '#0b0f1c', '#f1f3f8', '#686c78', '#3ee0c5']),
        preset('magenta', 'Magenta', ['#d6249f', '#170b14', '#f6f1f5', '#736a71', '#3ee0c5']),
        preset(
            'emerald',
            'Emerald',
            ['#0e9f6e', '#0a1712', '#f0f4f2', '#666e6a', '#5a46ff'],
            ['primary'],
        ),
        preset('mono', 'Mono', ['#1a1922', '#0b0b0f', '#f2f2f4', '#6b6a72', '#5a46ff']),
    ];

    // Orange with white labels on cream: pine text, bands and panels, sage-mist fills, warm-grey meta, apricot for warm
    // highlights; Pine and Moss pin white labels on their primary (brand-fill rule)
    const FINANCIAL_PLANNER_1_PRESETS = [
        preset(
            'pine',
            'Pine',
            ['#ff5d2a', '#0d3a30', '#dfe8e1', '#6f6b63', '#ffb37d'],
            ['primary'],
        ),
        preset('harbor', 'Harbor', ['#2f6bff', '#0f2547', '#dde6f6', '#666e7b', '#ffb37d']),
        preset('clay', 'Clay', ['#c4532f', '#2a1d17', '#f1e3d6', '#75695f', '#e9b86a']),
        preset(
            'moss',
            'Moss',
            ['#3f9b5f', '#12301f', '#dce9de', '#66706a', '#f2b36b'],
            ['primary'],
        ),
        preset('plum', 'Plum', ['#c23b7a', '#2a1630', '#f2dfe8', '#716670', '#f6b48a']),
    ];

    // Royal blue with white labels on cool paper (user 2026-10-23): navy-ink text, topbar, second folder and bands, pale
    // blue-mist fills, blue-grey meta, soft gold for ratings only; Raspberry keeps the stage-1 colours; Emerald and
    // Tangerine pin white labels on their primary (brand-fill rule)
    const TAX_ADVISOR_1_PRESETS = [
        preset('royal', 'Royal', ['#1637dc', '#0d1636', '#e6ecfb', '#686e7d', '#f2b544']),
        preset('raspberry', 'Raspberry', ['#e5175f', '#1a1218', '#f8e9e3', '#736a70', '#f2b544']),
        preset(
            'emerald',
            'Emerald',
            ['#169c6b', '#0e1f19', '#e0efe7', '#66706b', '#f2b544'],
            ['primary'],
        ),
        preset(
            'tangerine',
            'Tangerine',
            ['#f2652a', '#22150f', '#f9e6da', '#766a63', '#f2b544'],
            ['primary'],
        ),
        preset('violet', 'Violet', ['#7347e8', '#17112b', '#ebe5fb', '#6d687a', '#f2b544']),
    ];

    // Neon mint with ink labels (the fluorescent exception, as gym-1) on ink: graphite panels, grey meta, violet for chips
    // and chart dots with white labels on it; Amber keeps dark labels, Electric, Coral and Violet take white
    // (Electric's blue nudged from #3d6bff to #3a68ff so white reads at 4.5:1)
    const BUSINESS_LOANS_1_PRESETS = [
        preset('mint', 'Mint', ['#4df59a', '#0b0f0d', '#171c19', '#6b736e', '#8b6cff'], ['accent']),
        preset('electric', 'Electric', ['#3a68ff', '#0a0f1f', '#151b2e', '#6b7180', '#4df59a']),
        preset(
            'amber',
            'Amber',
            ['#ffb020', '#100d08', '#1c1914', '#736e66', '#8b6cff'],
            ['accent'],
        ),
        preset(
            'coral',
            'Coral',
            ['#ff5e57', '#120c0c', '#1d1717', '#746b6b', '#4df59a'],
            ['primary'],
        ),
        preset(
            'violet',
            'Violet',
            ['#8b6cff', '#0e0b1a', '#1a1726', '#6f6b7a', '#4df59a'],
            ['primary'],
        ),
    ];

    // Chartreuse with ink labels (the fluorescent exception, as business-loans-1) on cool grey (round 100, 2026-10-26): ink
    // text, topbar and hero scrim, grey-mist fills, grey meta, blue for small marks (white labels); Aqua and Tangerine keep
    // ink labels (Auto), Cobalt and Forest take white
    const INSURANCE_1_PRESETS = [
        preset('chartreuse', 'Chartreuse', ['#c6ec3f', '#121612', '#eef0ec', '#686d68', '#2f6df0']),
        preset('aqua', 'Aqua', ['#52d6c4', '#0e1716', '#ecf1f0', '#666d6c', '#2f6df0']),
        preset('cobalt', 'Cobalt', ['#2950e0', '#0d1226', '#eef0f5', '#686c76', '#c6ec3f']),
        preset('tangerine', 'Tangerine', ['#ff8c42', '#1a120d', '#f2efeb', '#6f6a66', '#2f6df0']),
        preset('forest', 'Forest', ['#1f6b4f', '#0d1a15', '#edf1ee', '#666e6a', '#c6ec3f']),
    ];

    // Shop round 1 (2026-10-23): white labels on every brand fill, so a primary or accent whose Auto text is dark is
    // pinned light (the themes pin --color-on-primary / --color-on-accent to #fff); tertiaries are the light grounds.

    // Electric blue on cool grey: navy ink text and strip, mist tiles, slate meta, signal orange for deal tags only
    const ELECTRONICS_STORE_1_PRESETS = [
        preset(
            'electric',
            'Electric',
            ['#1f5eff', '#0b1633', '#e9eef8', '#5f6b80', '#ff6b1a'],
            ['accent'],
        ),
        preset(
            'violet',
            'Violet',
            ['#6c4cf5', '#140f2e', '#ece8fb', '#655f7a', '#ff6b1a'],
            ['accent'],
        ),
        preset(
            'coral',
            'Coral',
            ['#f0473c', '#1a1012', '#f8e7e5', '#6f6264', '#2f6bff'],
            ['primary'],
        ),
        preset(
            'teal',
            'Teal',
            ['#0e9f8f', '#0a1f1d', '#e2f2ef', '#5c6e6b', '#ff6b1a'],
            ['primary', 'accent'],
        ),
        preset(
            'graphite',
            'Graphite',
            ['#2b2f36', '#0d0f12', '#eceef1', '#646a73', '#ff6b1a'],
            ['accent'],
        ),
    ];

    // Ink on ecru (the first ink-primary shop): warm-black text, stone fills, taupe meta, sale red for the Sale link and tags
    const FASHION_STORE_1_PRESETS = [
        preset('ink', 'Ink', ['#171717', '#0f0e0d', '#e8e2d8', '#6f6a62', '#d8352a']),
        preset('oxblood', 'Oxblood', ['#7a1f2b', '#1a0e10', '#efe2df', '#716466', '#d8352a']),
        preset('olive', 'Olive', ['#5d6338', '#16180e', '#e9e6d6', '#6d6b5e', '#d8352a']),
        preset('navy', 'Navy', ['#1f2f55', '#0c1120', '#e3e5ec', '#666a75', '#d8352a']),
        preset('camel', 'Camel', ['#a8743f', '#1e150c', '#f0e6d8', '#73685c', '#d8352a']),
    ];

    // Mauve plum on blush pearl: aubergine text and strip, lilac-blush fills, mauve-grey meta, champagne for hairlines and stars
    const JEWELRY_STORE_1_PRESETS = [
        preset('plum', 'Plum', ['#6e3b63', '#2a1626', '#f1e6ee', '#7a6a75', '#c7a06a'], ['accent']),
        preset(
            'emerald',
            'Emerald',
            ['#1f6b55', '#0f231c', '#e3efe9', '#66726c', '#c7a06a'],
            ['accent'],
        ),
        preset(
            'sapphire',
            'Sapphire',
            ['#284a8c', '#0f1830', '#e5e9f3', '#686d7a', '#c7a06a'],
            ['accent'],
        ),
        preset(
            'rosewood',
            'Rosewood',
            ['#9c4a4f', '#2a1415', '#f4e6e6', '#7a6a6b', '#c7a06a'],
            ['accent'],
        ),
        preset('onyx', 'Onyx', ['#2b2a2e', '#121114', '#ecebee', '#6d6b71', '#c7a06a'], ['accent']),
    ];

    // Soft leaf green on warm off-white (stage 4, 2026-10-24: softer, less green): charcoal text and footer, wheat stage
    // (its hue turns into the sky / pistachio / blush pastel blocks), warm-grey meta, tangerine for price tags and promos
    const GROCERY_STORE_1_PRESETS = [
        preset('leaf', 'Leaf', ['#558a3b', '#262b27', '#f3e3cb', '#6b6d67', '#f28a2e'], ['accent']),
        preset('tomato', 'Tomato', ['#d9503f', '#2d2624', '#f6e2d6', '#73685f', '#558a3b']),
        preset(
            'citrus',
            'Citrus',
            ['#e8892a', '#2c2722', '#f6e6c8', '#746a5c', '#558a3b'],
            ['primary'],
        ),
        preset(
            'berry',
            'Berry',
            ['#b0436f', '#2c2527', '#f4e2e6', '#73676b', '#f28a2e'],
            ['accent'],
        ),
        preset(
            'ocean',
            'Ocean',
            ['#2f7fae', '#232a2f', '#e2ecf2', '#636c72', '#f28a2e'],
            ['accent'],
        ),
    ];

    // Cognac on warm linen (stage 5, 2026-10-24: the user asked for brown / orange instead of green): espresso-ink text,
    // oat fills, warm-grey meta, brass for stars and small marks; Sage stays as a preset
    const FURNITURE_STORE_1_PRESETS = [
        preset('cognac', 'Cognac', ['#9e5a26', '#2b1d14', '#efe5d5', '#756a5e', '#946c26']),
        preset(
            'sage',
            'Sage',
            ['#6f8a6a', '#1d261c', '#ebe7dd', '#6c6b62', '#9e5a26'],
            ['primary'],
        ),
        preset(
            'ochre',
            'Ochre',
            ['#c28b2c', '#2a1f0c', '#f1e8d6', '#75695a', '#8f9d84'],
            ['primary', 'accent'],
        ),
        preset(
            'slate',
            'Slate',
            ['#4a6178', '#151d26', '#e6eaee', '#686e75', '#c28b2c'],
            ['accent'],
        ),
        preset('ink', 'Ink', ['#2b2b2b', '#141414', '#ecebe8', '#6d6a66', '#b65a36']),
    ];

    // Shop round 2 (2026-10-24): as round 1, white labels on every brand fill (the themes pin --color-on-primary /
    // --color-on-accent to #fff, a preset flags a fill whose Auto text is dark), except the neon volt, which keeps black.

    // Peony on blush white: cocoa text and strip, petal fills, rosy-grey meta, apricot for small marks
    const BEAUTY_STORE_1_PRESETS = [
        preset(
            'peony',
            'Peony',
            ['#d9667c', '#2b1a1c', '#f7e6e4', '#7a6a6b', '#f0a271'],
            ['primary', 'accent'],
        ),
        preset(
            'apricot',
            'Apricot',
            ['#e98a5e', '#2e1c14', '#f9e9df', '#7a6c64', '#d9667c'],
            ['primary', 'accent'],
        ),
        preset(
            'lilac',
            'Lilac',
            ['#9a7bd1', '#1e1630', '#efe9f8', '#6f6979', '#f0a271'],
            ['primary', 'accent'],
        ),
        preset(
            'sage',
            'Sage',
            ['#7f9a7c', '#1b231a', '#e9efe6', '#6a7068', '#d9667c'],
            ['primary', 'accent'],
        ),
        preset(
            'cocoa',
            'Cocoa',
            ['#6b4a3e', '#1f1511', '#f1e8e2', '#76695f', '#d9667c'],
            ['accent'],
        ),
    ];

    // Marigold on warm cream: navy text and strip, butter fills, warm-grey meta, cobalt for tags and links
    const PET_STORE_1_PRESETS = [
        preset(
            'marigold',
            'Marigold',
            ['#f4a425', '#1b2547', '#fff1cf', '#6d6a62', '#3462e0'],
            ['primary'],
        ),
        preset(
            'cobalt',
            'Cobalt',
            ['#3462e0', '#111b3d', '#e6ecfb', '#646b7a', '#f4a425'],
            ['accent'],
        ),
        preset(
            'coral',
            'Coral',
            ['#f2674a', '#33150f', '#fde6df', '#75665f', '#3462e0'],
            ['primary'],
        ),
        preset(
            'teal',
            'Teal',
            ['#16a394', '#0c2a27', '#dff3f0', '#5f6e6b', '#f4a425'],
            ['primary', 'accent'],
        ),
        preset('plum', 'Plum', ['#7b4fa3', '#1f1330', '#efe7f7', '#6d667a', '#f4a425'], ['accent']),
    ];

    // Sea glass on oat: deep-teal text and strip, peach fills, sage-grey meta, tomato for stickers and sale
    const KIDS_STORE_1_PRESETS = [
        preset(
            'sea-glass',
            'Sea Glass',
            ['#2a9d8f', '#123532', '#fde6d6', '#6b716e', '#f2643d'],
            ['primary', 'accent'],
        ),
        preset(
            'tomato',
            'Tomato',
            ['#ef5b3a', '#3a1810', '#fde8de', '#776660', '#2a9d8f'],
            ['primary', 'accent'],
        ),
        preset(
            'sky',
            'Sky',
            ['#4b8fe0', '#122a4a', '#e4effc', '#626d7a', '#f2643d'],
            ['primary', 'accent'],
        ),
        preset(
            'sunny',
            'Sunny',
            ['#f0b429', '#3a2a08', '#fff3d3', '#766c58', '#4b8fe0'],
            ['primary', 'accent'],
        ),
        preset(
            'berry',
            'Berry',
            ['#c2477a', '#3a1226', '#fae4ee', '#76656d', '#f0b429'],
            ['accent'],
        ),
    ];

    // Blaze on stone: basalt text, bands and strip, stone fills, graphite meta, moss for small marks
    const OUTDOOR_STORE_1_PRESETS = [
        preset(
            'blaze',
            'Blaze',
            ['#f2601d', '#141617', '#ebe9e3', '#6b6e70', '#8a9a5b'],
            ['primary', 'accent'],
        ),
        preset('moss', 'Moss', ['#6e7f3c', '#161a0f', '#e9eadf', '#6c6e62', '#f2601d'], ['accent']),
        preset(
            'glacier',
            'Glacier',
            ['#2f7fbf', '#0e1b26', '#e3edf5', '#646d75', '#f2601d'],
            ['accent'],
        ),
        preset(
            'canyon',
            'Canyon',
            ['#b5502b', '#1f120c', '#efe5dc', '#73685f', '#8a9a5b'],
            ['accent'],
        ),
        preset(
            'slate',
            'Slate',
            ['#3c4248', '#0f1113', '#e8e9ea', '#696d71', '#f2601d'],
            ['accent'],
        ),
    ];

    // Mono first (user review 2026-10-24): a black-and-white store, colour only in the products and their banners;
    // volt for small sale / new tags (black labels). The theme pins white on the primary only, and the Volt preset's
    // primary keeps Auto, black
    const SNEAKER_STORE_1_PRESETS = [
        preset('mono', 'Mono', ['#18181b', '#09090b', '#ececef', '#6b6b73', '#d4ff3a']),
        preset('ultraviolet', 'Ultraviolet', [
            '#6a4bff',
            '#0f0c1f',
            '#ece8ff',
            '#6a6780',
            '#d4ff3a',
        ]),
        preset('volt', 'Volt', ['#cbf23d', '#10140a', '#f1f7dc', '#686d5c', '#6a4bff']),
        preset(
            'infrared',
            'Infrared',
            ['#ff3b4e', '#1d0b0e', '#ffe6e8', '#776467', '#d4ff3a'],
            ['primary'],
        ),
        preset(
            'aqua',
            'Aqua',
            ['#00a9c7', '#06232a', '#dff6fa', '#5f7276', '#d4ff3a'],
            ['primary'],
        ),
    ];

    // Shop round 3 (2026-10-24): white labels on the brand fills (the themes pin --color-on-primary, and
    // --color-on-accent where the accent is a brand fill; a preset flags a fill whose Auto text is dark), except the
    // butter / amber / sunflower accents and the neon lime and mint, which keep Auto (black)

    // Chambray on cream: denim-navy text and strip, pale-mist fills, warm-grey meta, peach-sand stickers (dark labels).
    // The user's review (2026-10-24) swapped the cherry and butter for a soft blue and a warm peach
    const FASHION_STORE_2_PRESETS = [
        preset('chambray', 'Chambray', ['#56799e', '#1c2740', '#e5ecf4', '#6e6a62', '#f2c4a0']),
        preset('indigo', 'Indigo', ['#3f51a3', '#141a33', '#e4e7f5', '#666b78', '#f3cfae']),
        preset('olive', 'Olive', ['#6f7a35', '#1b1f10', '#eef0dc', '#6c6e60', '#f2c4a0']),
        preset('clay', 'Clay', ['#b0603f', '#2a1710', '#f6e4da', '#776a5f', '#bcd0e2']),
        preset('black', 'Black', ['#1d1d1f', '#0d0d0e', '#ececec', '#6b6b6b', '#f2c4a0']),
    ];

    // Jade on cool white: graphite text and strip, ice-mint fills, green-grey meta, coral for small marks
    // (the Carbon preset's lime accent keeps Auto, black)
    const ACTIVEWEAR_STORE_1_PRESETS = [
        preset(
            'jade',
            'Jade',
            ['#0d9b72', '#14181a', '#e2f4ee', '#657069', '#ff6b57'],
            ['primary', 'accent'],
        ),
        preset(
            'coral',
            'Coral',
            ['#f0573f', '#1c1210', '#fde5e0', '#76655f', '#0d9b72'],
            ['primary', 'accent'],
        ),
        preset(
            'electric',
            'Electric',
            ['#2f5bff', '#0d1330', '#e5ebff', '#646a7c', '#ff6b57'],
            ['accent'],
        ),
        preset(
            'lilac',
            'Lilac',
            ['#8a63d2', '#1a1326', '#efe8fa', '#6d6779', '#0d9b72'],
            ['accent'],
        ),
        preset('carbon', 'Carbon', ['#2a2e33', '#0d0f11', '#e7e9eb', '#686c71', '#d7f24a']),
    ];

    // Rosewood on nude white: cocoa text, blush-sand strip and fills, warm-taupe meta, soft gold for small marks
    const MAKEUP_STORE_1_PRESETS = [
        preset(
            'rosewood',
            'Rosewood',
            ['#a8585f', '#3a2a26', '#f3e5dd', '#7d6d67', '#c2a06a'],
            ['accent'],
        ),
        preset('clay', 'Clay', ['#a35b49', '#35241d', '#f4e6dc', '#7d6e66', '#c2a06a'], ['accent']),
        preset(
            'mauve',
            'Mauve',
            ['#8c5a72', '#33242c', '#f1e6ea', '#7a6d74', '#c2a06a'],
            ['accent'],
        ),
        preset('bronze', 'Bronze', ['#956340', '#33261c', '#f2e8dc', '#7b6e63', '#a8585f']),
        preset(
            'cocoa',
            'Cocoa',
            ['#5e4038', '#2a1e1a', '#efe7e1', '#7a6e69', '#c2a06a'],
            ['accent'],
        ),
    ];

    // Moss on raw linen: umber text and strip, linen fills, warm-grey meta, clay for small marks
    const HANDMADE_STORE_1_PRESETS = [
        preset('moss', 'Moss', ['#6c7a3c', '#2a2118', '#efe7da', '#736a5d', '#c4673f'], ['accent']),
        preset('clay', 'Clay', ['#c0613d', '#2b1810', '#f5e4da', '#77685f', '#6c7a3c']),
        preset(
            'indigo',
            'Indigo',
            ['#3e4e96', '#141a33', '#e5e8f4', '#676b7a', '#c4673f'],
            ['accent'],
        ),
        preset(
            'ochre',
            'Ochre',
            ['#b5852b', '#2a2010', '#f6ecd6', '#766c58', '#3e4e96'],
            ['primary'],
        ),
        preset(
            'charcoal',
            'Charcoal',
            ['#3a3835', '#161513', '#ebe8e3', '#6e6a64', '#c4673f'],
            ['accent'],
        ),
    ];

    // auto-parts-store-1 takes AUTO_SERVICES_1_PRESETS: the shop of the same brand switches with the service site

    // Slate blue on oat white: charcoal text and strip, mist fills, grey meta, oak for small marks
    const FURNITURE_STORE_2_PRESETS = [
        preset(
            'slate',
            'Slate',
            ['#4f6e88', '#22252a', '#e3e9ee', '#6a6f75', '#c49a6c'],
            ['accent'],
        ),
        preset('oak', 'Oak', ['#a57b4f', '#241a12', '#f1e8dd', '#746a60', '#4f6e88'], ['primary']),
        preset('sage', 'Sage', ['#71806a', '#1c211b', '#e6ebe3', '#6a7068', '#c49a6c'], ['accent']),
        preset('terracotta', 'Terracotta', ['#b8613f', '#2a1710', '#f4e3d9', '#776860', '#4f6e88']),
        preset(
            'charcoal',
            'Charcoal',
            ['#33363b', '#121315', '#e8e9eb', '#6b6e72', '#c49a6c'],
            ['accent'],
        ),
    ];

    // Royal blue on a cool off-white: navy ink text, light neutral chrome, mist fills, slate meta, a soft amber
    // accent for small marks (black labels); the primary on the logo, the buttons, the cart, the department button
    const MEGASTORE_1_PRESETS = [
        preset('royal', 'Royal', ['#2453c4', '#142038', '#e9edf3', '#656b76', '#e0a93b']),
        preset('navy', 'Navy', ['#1f3a6e', '#0f1a2e', '#e7eaf0', '#646a75', '#e0a93b']),
        preset('teal', 'Teal', ['#167477', '#0e2224', '#e5eeee', '#606c6c', '#e0a93b']),
        preset('terracotta', 'Terracotta', ['#c0532a', '#1d2433', '#eeebe5', '#6b6a70', '#d4a24c']),
        preset('graphite', 'Graphite', ['#33373f', '#121418', '#ebebec', '#696b70', '#2453c4']),
    ];

    // Violet on cool white: ink text and strip, lilac fills, grey-violet meta, mint for the compatibility check
    // (the mint accent keeps Auto, black)
    const TECH_ACCESSORIES_STORE_1_PRESETS = [
        preset('violet', 'Violet', ['#6b4cf6', '#121026', '#ece8fe', '#6a6780', '#2fd3a0']),
        preset(
            'mint',
            'Mint',
            ['#14b386', '#0b221b', '#ddf5ec', '#5f6e69', '#6b4cf6'],
            ['primary'],
        ),
        preset('sky', 'Sky', ['#1f8fe0', '#0b1a2a', '#e1effb', '#5f6c78', '#2fd3a0'], ['primary']),
        preset(
            'tangerine',
            'Tangerine',
            ['#f26b1d', '#24130a', '#fde8db', '#776a62', '#2fd3a0'],
            ['primary'],
        ),
        preset('graphite', 'Graphite', ['#2c2f36', '#0e0f12', '#e7e8eb', '#696c72', '#2fd3a0']),
    ];

    // Shop round 4 = round 100 (2026-10-26): white labels on the brand fills (the themes pin --color-on-primary, and
    // --color-on-accent where the accent is a brand fill), except the honey and champagne accents, which keep Auto (black)

    // Espresso on sand: deep-espresso text and strip, sand fills, warm-taupe meta, honey for one marker word or the active
    // segment
    const SKINCARE_STORE_1_PRESETS = [
        preset('espresso', 'Espresso', ['#4a2f25', '#2b1c16', '#f4ede3', '#75695f', '#d9993d']),
        preset('sage', 'Sage', ['#5c6b4e', '#1f241b', '#eef0e6', '#6c6e64', '#d9993d']),
        preset('clay', 'Clay', ['#9a4f45', '#2b1714', '#f6e8e2', '#77665f', '#d9993d']),
        preset('tide', 'Tide', ['#2f5d6b', '#13252b', '#e6eef0', '#636d70', '#d9993d']),
        preset('charcoal', 'Charcoal', ['#2e2b28', '#151311', '#efebe6', '#6e6a65', '#d9993d']),
    ];

    // Deep wine bordeaux on ivory (shifted off fashion-store-1's Oxblood #7a1f2b): near-black text, wordmark and strip,
    // ivory fills, warm-grey meta, camel for small marks (white labels); Cobalt's sand accent keeps Auto (black)
    const FASHION_STORE_3_PRESETS = [
        preset('bordeaux', 'Bordeaux', ['#6f1a2c', '#141011', '#f6f2ec', '#6f6966', '#8d5f3c']),
        preset('forest', 'Forest', ['#24453a', '#0e1512', '#f1f2ec', '#6a6d68', '#8d5f3c']),
        preset('cobalt', 'Cobalt', ['#2a44b8', '#0e1124', '#f1f2f6', '#6a6c74', '#d8b48a']),
        preset('rust', 'Rust', ['#a3462a', '#1c100c', '#f6efe9', '#746a64', '#2a44b8']),
        preset('noir', 'Noir', ['#1c1a19', '#0d0c0c', '#f2efea', '#6d6a66', '#8d5f3c']),
    ];

    // Sienna on sand ivory, read from the sunlit photography (2026-10-26 redo, no green): the clay strip, buttons and
    // slide timer, warm near-black text, sand fills, warm-grey meta, champagne for the cut-stone mark (Auto, black).
    // Companions: onyx, mink taupe, wine garnet, midnight blue
    const JEWELRY_STORE_2_PRESETS = [
        preset('sienna', 'Sienna', ['#94573f', '#1b1612', '#f4eee6', '#776b62', '#c6a46c']),
        preset('onyx', 'Onyx', ['#211d1b', '#141211', '#f5f1ea', '#716a63', '#c4a26a']),
        preset('mink', 'Mink', ['#75614f', '#211a15', '#f4f0ea', '#77706a', '#c4a268']),
        preset('garnet', 'Garnet', ['#7a3340', '#1f1012', '#f6efec', '#74686a', '#c9a56b']),
        preset('midnight', 'Midnight', ['#1f2a3d', '#0f141d', '#f3f1ec', '#6a6d73', '#c4a26a']),
    ];

    const deepFreeze = (value) => {
        if (value && typeof value === 'object') Object.values(value).forEach(deepFreeze);
        return Object.freeze(value);
    };

    deepFreeze([
        {
            id: 'main',
            name: 'Main',
            categories: ['business', 'agency'],
            page: 'demo-main.html',
            pages: [
                'demo-main.html',
                'demo-main-about.html',
                'demo-main-team.html',
                'demo-main-careers.html',
                'demo-main-services.html',
                'demo-main-service.html',
                'demo-main-portfolio.html',
                'demo-main-project.html',
                'demo-main-templates.html',
                'demo-main-pricing.html',
                'demo-main-blog.html',
                'demo-main-article.html',
                'demo-main-contact.html',
            ],
            theme: 'theme',
            baseOnly: true,
            thumbnail: 'screenshots',
            presets: MAIN_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'ai-agency-1',
            name: 'AI Agency',
            categories: ['agency', 'technology', 'business'],
            page: 'demo-ai-agency-1.html',
            pages: [
                'demo-ai-agency-1.html',
                'demo-ai-agency-1-about.html',
                'demo-ai-agency-1-team.html',
                'demo-ai-agency-1-careers.html',
                'demo-ai-agency-1-trust.html',
                'demo-ai-agency-1-process.html',
                'demo-ai-agency-1-services.html',
                'demo-ai-agency-1-service.html',
                'demo-ai-agency-1-solutions.html',
                'demo-ai-agency-1-case-studies.html',
                'demo-ai-agency-1-case-study.html',
                'demo-ai-agency-1-pricing.html',
                'demo-ai-agency-1-insights.html',
                'demo-ai-agency-1-article.html',
                'demo-ai-agency-1-roi.html',
                'demo-ai-agency-1-assessment.html',
                'demo-ai-agency-1-faq.html',
                'demo-ai-agency-1-contact.html',
            ],
            theme: 'demo-ai-agency-1',
            thumbnail: 'screenshots',
            presets: AI_AGENCY_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'seo-agency-1',
            name: 'SEO Agency',
            categories: ['agency', 'business'],
            page: 'demo-seo-agency-1.html',
            pages: [
                'demo-seo-agency-1.html',
                'demo-seo-agency-1-about.html',
                'demo-seo-agency-1-process.html',
                'demo-seo-agency-1-services.html',
                'demo-seo-agency-1-service.html',
                'demo-seo-agency-1-audit.html',
                'demo-seo-agency-1-contact.html',
                'demo-seo-agency-1-case-studies.html',
                'demo-seo-agency-1-case-study.html',
                'demo-seo-agency-1-pricing.html',
                'demo-seo-agency-1-insights.html',
                'demo-seo-agency-1-article.html',
            ],
            theme: 'demo-seo-agency-1',
            thumbnail: 'screenshots',
            presets: SEO_AGENCY_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'agency-1',
            name: 'Agency',
            categories: ['agency', 'business'],
            page: 'demo-agency-1.html',
            pages: [
                'demo-agency-1.html',
                'demo-agency-1-about.html',
                'demo-agency-1-team.html',
                'demo-agency-1-careers.html',
                'demo-agency-1-pricing.html',
                'demo-agency-1-faq.html',
                'demo-agency-1-services.html',
                'demo-agency-1-service.html',
                'demo-agency-1-work.html',
                'demo-agency-1-project.html',
                'demo-agency-1-journal.html',
                'demo-agency-1-article.html',
                'demo-agency-1-contact.html',
            ],
            theme: 'demo-agency-1',
            thumbnail: 'screenshots',
            presets: AGENCY_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'agency-2',
            name: 'Growth Agency',
            categories: ['agency', 'business'],
            page: 'demo-agency-2.html',
            pages: [
                'demo-agency-2.html',
                'demo-agency-2-about.html',
                'demo-agency-2-team.html',
                'demo-agency-2-careers.html',
                'demo-agency-2-faq.html',
                'demo-agency-2-services.html',
                'demo-agency-2-service.html',
                'demo-agency-2-case-studies.html',
                'demo-agency-2-case-study.html',
                'demo-agency-2-pricing.html',
                'demo-agency-2-insights.html',
                'demo-agency-2-article.html',
                'demo-agency-2-contact.html',
                'demo-agency-2-audit.html',
            ],
            theme: 'demo-agency-2',
            thumbnail: 'screenshots',
            presets: AGENCY_2_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'marketing-1',
            name: 'Marketing Agency',
            categories: ['agency', 'business'],
            page: 'demo-marketing-1.html',
            pages: [
                'demo-marketing-1.html',
                'demo-marketing-1-services.html',
                'demo-marketing-1-service.html',
                'demo-marketing-1-pricing.html',
                'demo-marketing-1-work.html',
                'demo-marketing-1-case-study.html',
                'demo-marketing-1-creators.html',
                'demo-marketing-1-about.html',
                'demo-marketing-1-blog.html',
                'demo-marketing-1-article.html',
                'demo-marketing-1-contact.html',
            ],
            theme: 'demo-marketing-1',
            thumbnail: 'screenshots',
            presets: MARKETING_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'freelancer-1',
            name: 'Freelancer',
            categories: ['portfolio'],
            page: 'demo-freelancer-1.html',
            pages: [
                'demo-freelancer-1.html',
                'demo-freelancer-1-work.html',
                'demo-freelancer-1-project.html',
                'demo-freelancer-1-about.html',
                'demo-freelancer-1-services.html',
                'demo-freelancer-1-blog.html',
                'demo-freelancer-1-article.html',
                'demo-freelancer-1-contact.html',
            ],
            theme: 'demo-freelancer-1',
            thumbnail: 'screenshots',
            presets: FREELANCER_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'creative-studio-1',
            name: 'Creative Studio',
            categories: ['portfolio', 'agency'],
            page: 'demo-creative-studio-1.html',
            pages: [
                'demo-creative-studio-1.html',
                'demo-creative-studio-1-work.html',
                'demo-creative-studio-1-project.html',
                'demo-creative-studio-1-studio.html',
                'demo-creative-studio-1-careers.html',
                'demo-creative-studio-1-services.html',
                'demo-creative-studio-1-blog.html',
                'demo-creative-studio-1-article.html',
                'demo-creative-studio-1-contact.html',
            ],
            theme: 'demo-creative-studio-1',
            thumbnail: 'screenshots',
            presets: CREATIVE_STUDIO_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'branding-studio-1',
            name: 'Branding Studio',
            categories: ['portfolio', 'agency'],
            page: 'demo-branding-studio-1.html',
            pages: [
                'demo-branding-studio-1.html',
                'demo-branding-studio-1-work.html',
                'demo-branding-studio-1-project.html',
                'demo-branding-studio-1-studio.html',
                'demo-branding-studio-1-services.html',
                'demo-branding-studio-1-packages.html',
                'demo-branding-studio-1-blog.html',
                'demo-branding-studio-1-article.html',
                'demo-branding-studio-1-contact.html',
            ],
            theme: 'demo-branding-studio-1',
            thumbnail: 'screenshots',
            presets: BRANDING_STUDIO_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'corporate-1',
            name: 'Corporate',
            categories: ['business', 'consulting'],
            page: 'demo-corporate-1.html',
            pages: [
                'demo-corporate-1.html',
                'demo-corporate-1-about.html',
                'demo-corporate-1-services.html',
                'demo-corporate-1-service.html',
                'demo-corporate-1-case-studies.html',
                'demo-corporate-1-case-study.html',
                'demo-corporate-1-team.html',
                'demo-corporate-1-careers.html',
                'demo-corporate-1-insights.html',
                'demo-corporate-1-article.html',
                'demo-corporate-1-faq.html',
                'demo-corporate-1-contact.html',
            ],
            theme: 'demo-corporate-1',
            thumbnail: 'screenshots',
            presets: CORPORATE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'holding-1',
            name: 'Holding Group',
            categories: ['business'],
            page: 'demo-holding-1.html',
            pages: [
                'demo-holding-1.html',
                'demo-holding-1-about.html',
                'demo-holding-1-leadership.html',
                'demo-holding-1-governance.html',
                'demo-holding-1-businesses.html',
                'demo-holding-1-business.html',
                'demo-holding-1-sustainability.html',
                'demo-holding-1-investors.html',
                'demo-holding-1-reports.html',
                'demo-holding-1-newsroom.html',
                'demo-holding-1-press-release.html',
                'demo-holding-1-careers.html',
                'demo-holding-1-contact.html',
            ],
            theme: 'demo-holding-1',
            thumbnail: 'screenshots',
            presets: HOLDING_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'engineering-1',
            name: 'Engineering',
            categories: ['business'],
            page: 'demo-engineering-1.html',
            pages: [
                'demo-engineering-1.html',
                'demo-engineering-1-services.html',
                'demo-engineering-1-service.html',
                'demo-engineering-1-markets.html',
                'demo-engineering-1-projects.html',
                'demo-engineering-1-project.html',
                'demo-engineering-1-about.html',
                'demo-engineering-1-safety.html',
                'demo-engineering-1-careers.html',
                'demo-engineering-1-insights.html',
                'demo-engineering-1-article.html',
                'demo-engineering-1-contact.html',
            ],
            theme: 'demo-engineering-1',
            thumbnail: 'screenshots',
            presets: ENGINEERING_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'investment-1',
            name: 'Private Capital',
            categories: ['business'],
            page: 'demo-investment-1.html',
            pages: [
                'demo-investment-1.html',
                'demo-investment-1-strategies.html',
                'demo-investment-1-strategy.html',
                'demo-investment-1-portfolio.html',
                'demo-investment-1-case-study.html',
                'demo-investment-1-approach.html',
                'demo-investment-1-team.html',
                'demo-investment-1-perspectives.html',
                'demo-investment-1-article.html',
                'demo-investment-1-contact.html',
                'demo-investment-1-investor-login.html',
            ],
            theme: 'demo-investment-1',
            thumbnail: 'screenshots',
            presets: INVESTMENT_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'consulting-1',
            name: 'Consulting',
            categories: ['consulting', 'business'],
            page: 'demo-consulting-1.html',
            pages: [
                'demo-consulting-1.html',
                'demo-consulting-1-capabilities.html',
                'demo-consulting-1-capability.html',
                'demo-consulting-1-industries.html',
                'demo-consulting-1-case-studies.html',
                'demo-consulting-1-case-study.html',
                'demo-consulting-1-insights.html',
                'demo-consulting-1-article.html',
                'demo-consulting-1-about.html',
                'demo-consulting-1-people.html',
                'demo-consulting-1-careers.html',
                'demo-consulting-1-contact.html',
            ],
            theme: 'demo-consulting-1',
            thumbnail: 'screenshots',
            presets: CONSULTING_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'executive-coach-1',
            name: 'Executive Coaching',
            categories: ['consulting', 'business'],
            page: 'demo-executive-coach-1.html',
            pages: [
                'demo-executive-coach-1.html',
                'demo-executive-coach-1-programmes.html',
                'demo-executive-coach-1-programme.html',
                'demo-executive-coach-1-coaches.html',
                'demo-executive-coach-1-coach.html',
                'demo-executive-coach-1-approach.html',
                'demo-executive-coach-1-results.html',
                'demo-executive-coach-1-insights.html',
                'demo-executive-coach-1-article.html',
                'demo-executive-coach-1-about.html',
                'demo-executive-coach-1-contact.html',
            ],
            theme: 'demo-executive-coach-1',
            thumbnail: 'screenshots',
            presets: EXECUTIVE_COACH_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'life-coach-1',
            name: 'Life Coach',
            categories: ['consulting'],
            page: 'demo-life-coach-1.html',
            pages: [
                'demo-life-coach-1.html',
                'demo-life-coach-1-about.html',
                'demo-life-coach-1-coaching.html',
                'demo-life-coach-1-programme.html',
                'demo-life-coach-1-retreats.html',
                'demo-life-coach-1-podcast.html',
                'demo-life-coach-1-blog.html',
                'demo-life-coach-1-article.html',
                'demo-life-coach-1-contact.html',
                'demo-life-coach-1-book.html',
            ],
            theme: 'demo-life-coach-1',
            thumbnail: 'screenshots',
            presets: LIFE_COACH_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'wealth-1',
            name: 'Wealth Management',
            categories: ['business'],
            page: 'demo-wealth-1.html',
            pages: [
                'demo-wealth-1.html',
                'demo-wealth-1-who-we-help.html',
                'demo-wealth-1-services.html',
                'demo-wealth-1-service.html',
                'demo-wealth-1-retirement.html',
                'demo-wealth-1-about.html',
                'demo-wealth-1-advisers.html',
                'demo-wealth-1-fees.html',
                'demo-wealth-1-insights.html',
                'demo-wealth-1-article.html',
                'demo-wealth-1-contact.html',
            ],
            theme: 'demo-wealth-1',
            thumbnail: 'screenshots',
            presets: WEALTH_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'accounting-1',
            name: 'Accounting Firm',
            categories: ['business'],
            page: 'demo-accounting-1.html',
            pages: [
                'demo-accounting-1.html',
                'demo-accounting-1-services.html',
                'demo-accounting-1-service.html',
                'demo-accounting-1-who-we-help.html',
                'demo-accounting-1-pricing.html',
                'demo-accounting-1-blog.html',
                'demo-accounting-1-article.html',
                'demo-accounting-1-tax-calendar.html',
                'demo-accounting-1-calculators.html',
                'demo-accounting-1-about.html',
                'demo-accounting-1-team.html',
                'demo-accounting-1-contact.html',
            ],
            theme: 'demo-accounting-1',
            thumbnail: 'screenshots',
            presets: ACCOUNTING_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'banking-1',
            name: 'Digital Banking',
            categories: ['technology', 'business'],
            page: 'demo-banking-1.html',
            pages: [
                'demo-banking-1.html',
                'demo-banking-1-account.html',
                'demo-banking-1-cards.html',
                'demo-banking-1-payments.html',
                'demo-banking-1-pricing.html',
                'demo-banking-1-about.html',
                'demo-banking-1-careers.html',
                'demo-banking-1-security.html',
                'demo-banking-1-help.html',
                'demo-banking-1-open-account.html',
            ],
            theme: 'demo-banking-1',
            thumbnail: 'screenshots',
            presets: BANKING_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'mortgage-1',
            name: 'Mortgage Broker',
            categories: ['business'],
            page: 'demo-mortgage-1.html',
            pages: [
                'demo-mortgage-1.html',
                'demo-mortgage-1-mortgages.html',
                'demo-mortgage-1-mortgage.html',
                'demo-mortgage-1-rates.html',
                'demo-mortgage-1-calculators.html',
                'demo-mortgage-1-how-it-works.html',
                'demo-mortgage-1-reviews.html',
                'demo-mortgage-1-guides.html',
                'demo-mortgage-1-article.html',
                'demo-mortgage-1-about.html',
                'demo-mortgage-1-contact.html',
            ],
            theme: 'demo-mortgage-1',
            thumbnail: 'screenshots',
            presets: MORTGAGE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'trading-1',
            name: 'Trading Platform',
            categories: ['technology', 'business'],
            page: 'demo-trading-1.html',
            pages: [
                'demo-trading-1.html',
                'demo-trading-1-invest.html',
                'demo-trading-1-isa.html',
                'demo-trading-1-markets.html',
                'demo-trading-1-pricing.html',
                'demo-trading-1-academy.html',
                'demo-trading-1-news.html',
                'demo-trading-1-article.html',
                'demo-trading-1-about.html',
                'demo-trading-1-security.html',
                'demo-trading-1-open-account.html',
            ],
            theme: 'demo-trading-1',
            thumbnail: 'screenshots',
            presets: TRADING_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'analytics-1',
            name: 'SaaS Analytics',
            categories: ['technology', 'business'],
            page: 'demo-analytics-1.html',
            pages: [
                'demo-analytics-1.html',
                'demo-analytics-1-product.html',
                'demo-analytics-1-feature.html',
                'demo-analytics-1-analyst.html',
                'demo-analytics-1-solutions.html',
                'demo-analytics-1-integrations.html',
                'demo-analytics-1-pricing.html',
                'demo-analytics-1-customers.html',
                'demo-analytics-1-customer-story.html',
                'demo-analytics-1-changelog.html',
                'demo-analytics-1-about.html',
                'demo-analytics-1-contact.html',
            ],
            theme: 'demo-analytics-1',
            thumbnail: 'screenshots',
            presets: ANALYTICS_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'automation-1',
            name: 'SaaS Automation',
            categories: ['technology', 'business'],
            page: 'demo-automation-1.html',
            pages: [
                'demo-automation-1.html',
                'demo-automation-1-platform.html',
                'demo-automation-1-agents.html',
                'demo-automation-1-solutions.html',
                'demo-automation-1-integrations.html',
                'demo-automation-1-templates.html',
                'demo-automation-1-pricing.html',
                'demo-automation-1-customers.html',
                'demo-automation-1-customer-story.html',
                'demo-automation-1-changelog.html',
                'demo-automation-1-security.html',
                'demo-automation-1-contact.html',
            ],
            theme: 'demo-automation-1',
            thumbnail: 'screenshots',
            presets: AUTOMATION_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'ai-studio-1',
            name: 'AI Creative Studio',
            categories: ['technology'],
            page: 'demo-ai-studio-1.html',
            pages: [
                'demo-ai-studio-1.html',
                'demo-ai-studio-1-create.html',
                'demo-ai-studio-1-image.html',
                'demo-ai-studio-1-video.html',
                'demo-ai-studio-1-gallery.html',
                'demo-ai-studio-1-models.html',
                'demo-ai-studio-1-pricing.html',
                'demo-ai-studio-1-blog.html',
                'demo-ai-studio-1-article.html',
                'demo-ai-studio-1-about.html',
                'demo-ai-studio-1-enterprise.html',
                'demo-ai-studio-1-contact.html',
            ],
            theme: 'demo-ai-studio-1',
            thumbnail: 'screenshots',
            presets: AI_STUDIO_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: false, hide: [] },
        },
        {
            id: 'ai-chatbot-1',
            name: 'AI Support Agent',
            categories: ['technology', 'business'],
            page: 'demo-ai-chatbot-1.html',
            pages: [
                'demo-ai-chatbot-1.html',
                'demo-ai-chatbot-1-product.html',
                'demo-ai-chatbot-1-voice.html',
                'demo-ai-chatbot-1-integrations.html',
                'demo-ai-chatbot-1-security.html',
                'demo-ai-chatbot-1-solutions.html',
                'demo-ai-chatbot-1-pricing.html',
                'demo-ai-chatbot-1-customers.html',
                'demo-ai-chatbot-1-customer-story.html',
                'demo-ai-chatbot-1-blog.html',
                'demo-ai-chatbot-1-article.html',
                'demo-ai-chatbot-1-about.html',
                'demo-ai-chatbot-1-contact.html',
            ],
            theme: 'demo-ai-chatbot-1',
            thumbnail: 'screenshots',
            presets: AI_CHATBOT_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'fitness-app-1',
            name: 'Fitness App',
            categories: ['technology'],
            page: 'demo-fitness-app-1.html',
            pages: [
                'demo-fitness-app-1.html',
                'demo-fitness-app-1-features.html',
                'demo-fitness-app-1-plans.html',
                'demo-fitness-app-1-coaches.html',
                'demo-fitness-app-1-blog.html',
                'demo-fitness-app-1-article.html',
                'demo-fitness-app-1-about.html',
                'demo-fitness-app-1-contact.html',
            ],
            theme: 'demo-fitness-app-1',
            thumbnail: 'screenshots',
            presets: FITNESS_APP_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'meditation-app-1',
            name: 'Meditation App',
            categories: ['technology'],
            page: 'demo-meditation-app-1.html',
            pages: [
                'demo-meditation-app-1.html',
                'demo-meditation-app-1-sleep.html',
                'demo-meditation-app-1-meditate.html',
                'demo-meditation-app-1-premium.html',
                'demo-meditation-app-1-blog.html',
                'demo-meditation-app-1-article.html',
                'demo-meditation-app-1-about.html',
                'demo-meditation-app-1-contact.html',
            ],
            theme: 'demo-meditation-app-1',
            thumbnail: 'screenshots',
            presets: MEDITATION_APP_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: false, hide: [] },
        },
        {
            id: 'startup-1',
            name: 'Startup',
            categories: ['technology', 'business'],
            page: 'demo-startup-1.html',
            pages: [
                'demo-startup-1.html',
                'demo-startup-1-product.html',
                'demo-startup-1-pricing.html',
                'demo-startup-1-changelog.html',
                'demo-startup-1-customers.html',
                'demo-startup-1-about.html',
                'demo-startup-1-blog.html',
                'demo-startup-1-article.html',
                'demo-startup-1-contact.html',
            ],
            theme: 'demo-startup-1',
            thumbnail: 'screenshots',
            presets: STARTUP_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'it-services-1',
            name: 'IT Services',
            categories: ['technology', 'business'],
            page: 'demo-it-services-1.html',
            pages: [
                'demo-it-services-1.html',
                'demo-it-services-1-services.html',
                'demo-it-services-1-service.html',
                'demo-it-services-1-case-studies.html',
                'demo-it-services-1-pricing.html',
                'demo-it-services-1-about.html',
                'demo-it-services-1-blog.html',
                'demo-it-services-1-article.html',
                'demo-it-services-1-contact.html',
            ],
            theme: 'demo-it-services-1',
            thumbnail: 'screenshots',
            presets: IT_SERVICES_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'software-dev-1',
            name: 'Software Development',
            categories: ['technology', 'business'],
            page: 'demo-software-dev-1.html',
            pages: [
                'demo-software-dev-1.html',
                'demo-software-dev-1-services.html',
                'demo-software-dev-1-service.html',
                'demo-software-dev-1-work.html',
                'demo-software-dev-1-case-study.html',
                'demo-software-dev-1-about.html',
                'demo-software-dev-1-insights.html',
                'demo-software-dev-1-article.html',
                'demo-software-dev-1-contact.html',
            ],
            theme: 'demo-software-dev-1',
            thumbnail: 'screenshots',
            presets: SOFTWARE_DEV_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'cybersecurity-1',
            name: 'Cybersecurity',
            categories: ['technology', 'business'],
            page: 'demo-cybersecurity-1.html',
            pages: [
                'demo-cybersecurity-1.html',
                'demo-cybersecurity-1-platform.html',
                'demo-cybersecurity-1-module.html',
                'demo-cybersecurity-1-pricing.html',
                'demo-cybersecurity-1-customers.html',
                'demo-cybersecurity-1-about.html',
                'demo-cybersecurity-1-blog.html',
                'demo-cybersecurity-1-article.html',
                'demo-cybersecurity-1-contact.html',
            ],
            theme: 'demo-cybersecurity-1',
            thumbnail: 'screenshots',
            presets: CYBERSECURITY_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: false, hide: [] },
        },
        {
            id: 'security-services-1',
            name: 'Security Services',
            categories: ['technology', 'business'],
            page: 'demo-security-services-1.html',
            pages: [
                'demo-security-services-1.html',
                'demo-security-services-1-services.html',
                'demo-security-services-1-service.html',
                'demo-security-services-1-industries.html',
                'demo-security-services-1-research.html',
                'demo-security-services-1-article.html',
                'demo-security-services-1-about.html',
                'demo-security-services-1-incident.html',
                'demo-security-services-1-contact.html',
            ],
            theme: 'demo-security-services-1',
            thumbnail: 'screenshots',
            presets: SECURITY_SERVICES_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'cloud-hosting-1',
            name: 'Cloud Hosting',
            categories: ['technology', 'business'],
            page: 'demo-cloud-hosting-1.html',
            pages: [
                'demo-cloud-hosting-1.html',
                'demo-cloud-hosting-1-products.html',
                'demo-cloud-hosting-1-product.html',
                'demo-cloud-hosting-1-pricing.html',
                'demo-cloud-hosting-1-regions.html',
                'demo-cloud-hosting-1-customers.html',
                'demo-cloud-hosting-1-about.html',
                'demo-cloud-hosting-1-blog.html',
                'demo-cloud-hosting-1-contact.html',
            ],
            theme: 'demo-cloud-hosting-1',
            thumbnail: 'screenshots',
            presets: CLOUD_HOSTING_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: false, hide: [] },
        },
        {
            id: 'architecture-studio-1',
            name: 'Architecture Studio',
            categories: ['portfolio', 'business'],
            page: 'demo-architecture-studio-1.html',
            pages: [
                'demo-architecture-studio-1.html',
                'demo-architecture-studio-1-projects.html',
                'demo-architecture-studio-1-project.html',
                'demo-architecture-studio-1-about.html',
                'demo-architecture-studio-1-people.html',
                'demo-architecture-studio-1-careers.html',
                'demo-architecture-studio-1-services.html',
                'demo-architecture-studio-1-blog.html',
                'demo-architecture-studio-1-article.html',
                'demo-architecture-studio-1-contact.html',
            ],
            theme: 'demo-architecture-studio-1',
            thumbnail: 'screenshots',
            presets: ARCHITECTURE_STUDIO_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'architecture-firm-1',
            name: 'Architecture Firm',
            categories: ['portfolio', 'business'],
            page: 'demo-architecture-firm-1.html',
            pages: [
                'demo-architecture-firm-1.html',
                'demo-architecture-firm-1-projects.html',
                'demo-architecture-firm-1-project.html',
                'demo-architecture-firm-1-sectors.html',
                'demo-architecture-firm-1-sector.html',
                'demo-architecture-firm-1-about.html',
                'demo-architecture-firm-1-people.html',
                'demo-architecture-firm-1-sustainability.html',
                'demo-architecture-firm-1-insights.html',
                'demo-architecture-firm-1-article.html',
                'demo-architecture-firm-1-careers.html',
                'demo-architecture-firm-1-contact.html',
            ],
            theme: 'demo-architecture-firm-1',
            thumbnail: 'screenshots',
            presets: ARCHITECTURE_FIRM_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'square',
            switcher: { scheme: false, hide: [] },
        },
        {
            id: 'law-firm-1',
            name: 'Law Firm',
            categories: ['business'],
            page: 'demo-law-firm-1.html',
            pages: [
                'demo-law-firm-1.html',
                'demo-law-firm-1-practices.html',
                'demo-law-firm-1-practice.html',
                'demo-law-firm-1-industries.html',
                'demo-law-firm-1-people.html',
                'demo-law-firm-1-lawyer.html',
                'demo-law-firm-1-insights.html',
                'demo-law-firm-1-article.html',
                'demo-law-firm-1-about.html',
                'demo-law-firm-1-pro-bono.html',
                'demo-law-firm-1-careers.html',
                'demo-law-firm-1-contact.html',
            ],
            theme: 'demo-law-firm-1',
            thumbnail: 'screenshots',
            presets: LAW_FIRM_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'medical-clinic-1',
            name: 'Medical Clinic',
            categories: ['health-beauty'],
            page: 'demo-medical-clinic-1.html',
            pages: [
                'demo-medical-clinic-1.html',
                'demo-medical-clinic-1-specialties.html',
                'demo-medical-clinic-1-specialty.html',
                'demo-medical-clinic-1-doctors.html',
                'demo-medical-clinic-1-doctor.html',
                'demo-medical-clinic-1-patients.html',
                'demo-medical-clinic-1-telehealth.html',
                'demo-medical-clinic-1-locations.html',
                'demo-medical-clinic-1-blog.html',
                'demo-medical-clinic-1-article.html',
                'demo-medical-clinic-1-contact.html',
            ],
            theme: 'demo-medical-clinic-1',
            thumbnail: 'screenshots',
            presets: MEDICAL_CLINIC_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'beauty-salon-1',
            name: 'Beauty Salon',
            categories: ['health-beauty'],
            page: 'demo-beauty-salon-1.html',
            pages: [
                'demo-beauty-salon-1.html',
                'demo-beauty-salon-1-services.html',
                'demo-beauty-salon-1-hair.html',
                'demo-beauty-salon-1-nails.html',
                'demo-beauty-salon-1-brows-lashes.html',
                'demo-beauty-salon-1-prices.html',
                'demo-beauty-salon-1-team.html',
                'demo-beauty-salon-1-gallery.html',
                'demo-beauty-salon-1-about.html',
                'demo-beauty-salon-1-gift-cards.html',
                'demo-beauty-salon-1-blog.html',
                'demo-beauty-salon-1-article.html',
                'demo-beauty-salon-1-contact.html',
            ],
            theme: 'demo-beauty-salon-1',
            thumbnail: 'screenshots',
            presets: BEAUTY_SALON_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'spa-1',
            name: 'Day Spa',
            categories: ['health-beauty'],
            page: 'demo-spa-1.html',
            pages: [
                'demo-spa-1.html',
                'demo-spa-1-treatments.html',
                'demo-spa-1-treatment.html',
                'demo-spa-1-thermal.html',
                'demo-spa-1-rituals.html',
                'demo-spa-1-membership.html',
                'demo-spa-1-gift-cards.html',
                'demo-spa-1-about.html',
                'demo-spa-1-guide.html',
                'demo-spa-1-blog.html',
                'demo-spa-1-article.html',
                'demo-spa-1-contact.html',
            ],
            theme: 'demo-spa-1',
            thumbnail: 'screenshots',
            presets: SPA_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'skin-clinic-1',
            name: 'Skin Clinic',
            categories: ['health-beauty'],
            page: 'demo-skin-clinic-1.html',
            pages: [
                'demo-skin-clinic-1.html',
                'demo-skin-clinic-1-treatments.html',
                'demo-skin-clinic-1-treatment.html',
                'demo-skin-clinic-1-injectables.html',
                'demo-skin-clinic-1-skin.html',
                'demo-skin-clinic-1-results.html',
                'demo-skin-clinic-1-memberships.html',
                'demo-skin-clinic-1-team.html',
                'demo-skin-clinic-1-blog.html',
                'demo-skin-clinic-1-article.html',
                'demo-skin-clinic-1-contact.html',
            ],
            theme: 'demo-skin-clinic-1',
            thumbnail: 'screenshots',
            presets: SKIN_CLINIC_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'gym-1',
            name: 'Gym & Strength',
            categories: ['health-beauty'],
            page: 'demo-gym-1.html',
            pages: [
                'demo-gym-1.html',
                'demo-gym-1-training.html',
                'demo-gym-1-schedule.html',
                'demo-gym-1-memberships.html',
                'demo-gym-1-coaches.html',
                'demo-gym-1-coach.html',
                'demo-gym-1-about.html',
                'demo-gym-1-facility.html',
                'demo-gym-1-new-here.html',
                'demo-gym-1-faq.html',
                'demo-gym-1-contact.html',
            ],
            theme: 'demo-gym-1',
            thumbnail: 'screenshots',
            presets: GYM_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'square',
            switcher: { scheme: false, hide: [] },
        },
        {
            id: 'yoga-studio-1',
            name: 'Yoga Studio',
            categories: ['health-beauty'],
            page: 'demo-yoga-studio-1.html',
            pages: [
                'demo-yoga-studio-1.html',
                'demo-yoga-studio-1-classes.html',
                'demo-yoga-studio-1-schedule.html',
                'demo-yoga-studio-1-pricing.html',
                'demo-yoga-studio-1-new-students.html',
                'demo-yoga-studio-1-teachers.html',
                'demo-yoga-studio-1-teacher-training.html',
                'demo-yoga-studio-1-workshops.html',
                'demo-yoga-studio-1-retreats.html',
                'demo-yoga-studio-1-about.html',
                'demo-yoga-studio-1-blog.html',
                'demo-yoga-studio-1-article.html',
                'demo-yoga-studio-1-contact.html',
            ],
            theme: 'demo-yoga-studio-1',
            thumbnail: 'screenshots',
            presets: YOGA_STUDIO_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'pilates-1',
            name: 'Pilates Studio',
            categories: ['health-beauty'],
            page: 'demo-pilates-1.html',
            pages: [
                'demo-pilates-1.html',
                'demo-pilates-1-classes.html',
                'demo-pilates-1-class.html',
                'demo-pilates-1-schedule.html',
                'demo-pilates-1-pricing.html',
                'demo-pilates-1-instructors.html',
                'demo-pilates-1-new-here.html',
                'demo-pilates-1-about.html',
                'demo-pilates-1-privates.html',
                'demo-pilates-1-teacher-training.html',
                'demo-pilates-1-contact.html',
            ],
            theme: 'demo-pilates-1',
            thumbnail: 'screenshots',
            presets: PILATES_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'dance-studio-1',
            name: 'Dance Studio',
            categories: ['health-beauty'],
            page: 'demo-dance-studio-1.html',
            pages: [
                'demo-dance-studio-1.html',
                'demo-dance-studio-1-programs.html',
                'demo-dance-studio-1-program.html',
                'demo-dance-studio-1-schedule.html',
                'demo-dance-studio-1-tuition.html',
                'demo-dance-studio-1-faculty.html',
                'demo-dance-studio-1-performances.html',
                'demo-dance-studio-1-summer-intensive.html',
                'demo-dance-studio-1-about.html',
                'demo-dance-studio-1-faq.html',
                'demo-dance-studio-1-register.html',
                'demo-dance-studio-1-contact.html',
            ],
            theme: 'demo-dance-studio-1',
            thumbnail: 'screenshots',
            presets: DANCE_STUDIO_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'restaurant-1',
            name: 'Restaurant',
            categories: ['hospitality'],
            page: 'demo-restaurant-1.html',
            pages: [
                'demo-restaurant-1.html',
                'demo-restaurant-1-menus.html',
                'demo-restaurant-1-wine.html',
                'demo-restaurant-1-reservations.html',
                'demo-restaurant-1-private-dining.html',
                'demo-restaurant-1-about.html',
                'demo-restaurant-1-team.html',
                'demo-restaurant-1-producers.html',
                'demo-restaurant-1-gift-cards.html',
                'demo-restaurant-1-contact.html',
            ],
            theme: 'demo-restaurant-1',
            thumbnail: 'screenshots',
            presets: RESTAURANT_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'cafe-1',
            name: 'Café & Bakery',
            categories: ['hospitality'],
            page: 'demo-cafe-1.html',
            pages: [
                'demo-cafe-1.html',
                'demo-cafe-1-menu.html',
                'demo-cafe-1-shop.html',
                'demo-cafe-1-product.html',
                'demo-cafe-1-subscriptions.html',
                'demo-cafe-1-catering.html',
                'demo-cafe-1-cafes.html',
                'demo-cafe-1-about.html',
                'demo-cafe-1-classes.html',
                'demo-cafe-1-wholesale.html',
                'demo-cafe-1-cart.html',
                'demo-cafe-1-contact.html',
            ],
            theme: 'demo-cafe-1',
            thumbnail: 'screenshots',
            presets: CAFE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'resort-1',
            name: 'Island Resort',
            categories: ['hospitality'],
            page: 'demo-resort-1.html',
            pages: [
                'demo-resort-1.html',
                'demo-resort-1-rooms.html',
                'demo-resort-1-room.html',
                'demo-resort-1-dining.html',
                'demo-resort-1-spa.html',
                'demo-resort-1-experiences.html',
                'demo-resort-1-offers.html',
                'demo-resort-1-island.html',
                'demo-resort-1-getting-here.html',
                'demo-resort-1-weddings.html',
                'demo-resort-1-gallery.html',
                'demo-resort-1-contact.html',
            ],
            theme: 'demo-resort-1',
            thumbnail: 'screenshots',
            presets: RESORT_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'factory-1',
            name: 'Factory & Manufacturing',
            categories: ['industry', 'business'],
            page: 'demo-factory-1.html',
            pages: [
                'demo-factory-1.html',
                'demo-factory-1-capabilities.html',
                'demo-factory-1-capability.html',
                'demo-factory-1-industries.html',
                'demo-factory-1-industry.html',
                'demo-factory-1-quality.html',
                'demo-factory-1-facilities.html',
                'demo-factory-1-about.html',
                'demo-factory-1-careers.html',
                'demo-factory-1-news.html',
                'demo-factory-1-article.html',
                'demo-factory-1-contact.html',
            ],
            theme: 'demo-factory-1',
            thumbnail: 'screenshots',
            presets: FACTORY_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'square',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'solar-energy-1',
            name: 'Solar Installer',
            categories: ['industry', 'business'],
            page: 'demo-solar-energy-1.html',
            pages: [
                'demo-solar-energy-1.html',
                'demo-solar-energy-1-solar-panels.html',
                'demo-solar-energy-1-battery-storage.html',
                'demo-solar-energy-1-ev-chargers.html',
                'demo-solar-energy-1-commercial.html',
                'demo-solar-energy-1-how-it-works.html',
                'demo-solar-energy-1-savings.html',
                'demo-solar-energy-1-projects.html',
                'demo-solar-energy-1-about.html',
                'demo-solar-energy-1-blog.html',
                'demo-solar-energy-1-article.html',
                'demo-solar-energy-1-contact.html',
            ],
            theme: 'demo-solar-energy-1',
            thumbnail: 'screenshots',
            presets: SOLAR_ENERGY_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'renewable-energy-1',
            name: 'Renewable Energy',
            categories: ['industry', 'business'],
            page: 'demo-renewable-energy-1.html',
            pages: [
                'demo-renewable-energy-1.html',
                'demo-renewable-energy-1-what-we-do.html',
                'demo-renewable-energy-1-wind.html',
                'demo-renewable-energy-1-solar.html',
                'demo-renewable-energy-1-storage.html',
                'demo-renewable-energy-1-projects.html',
                'demo-renewable-energy-1-project.html',
                'demo-renewable-energy-1-landowners.html',
                'demo-renewable-energy-1-communities.html',
                'demo-renewable-energy-1-about.html',
                'demo-renewable-energy-1-careers.html',
                'demo-renewable-energy-1-news.html',
                'demo-renewable-energy-1-article.html',
                'demo-renewable-energy-1-contact.html',
            ],
            theme: 'demo-renewable-energy-1',
            thumbnail: 'screenshots',
            presets: RENEWABLE_ENERGY_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'construction-1',
            name: 'Construction',
            categories: ['industry', 'business'],
            page: 'demo-construction-1.html',
            pages: [
                'demo-construction-1.html',
                'demo-construction-1-services.html',
                'demo-construction-1-preconstruction.html',
                'demo-construction-1-sectors.html',
                'demo-construction-1-projects.html',
                'demo-construction-1-project.html',
                'demo-construction-1-safety.html',
                'demo-construction-1-about.html',
                'demo-construction-1-leadership.html',
                'demo-construction-1-careers.html',
                'demo-construction-1-news.html',
                'demo-construction-1-article.html',
                'demo-construction-1-contact.html',
            ],
            theme: 'demo-construction-1',
            thumbnail: 'screenshots',
            presets: CONSTRUCTION_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'square',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'construction-2',
            name: 'Construction & Renovation',
            categories: ['industry', 'business'],
            page: 'demo-construction-2.html',
            pages: [
                'demo-construction-2.html',
                'demo-construction-2-about.html',
                'demo-construction-2-team.html',
                'demo-construction-2-careers.html',
                'demo-construction-2-reviews.html',
                'demo-construction-2-services.html',
                'demo-construction-2-service.html',
                'demo-construction-2-projects.html',
                'demo-construction-2-project.html',
                'demo-construction-2-blog.html',
                'demo-construction-2-article.html',
                'demo-construction-2-contact.html',
            ],
            theme: 'demo-construction-2',
            thumbnail: 'screenshots',
            presets: CONSTRUCTION_2_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'corporate-2',
            name: 'Business Consulting',
            categories: ['business', 'consulting'],
            page: 'demo-corporate-2.html',
            pages: [
                'demo-corporate-2.html',
                'demo-corporate-2-about.html',
                'demo-corporate-2-team.html',
                'demo-corporate-2-careers.html',
                'demo-corporate-2-services.html',
                'demo-corporate-2-service.html',
                'demo-corporate-2-case-studies.html',
                'demo-corporate-2-case-study.html',
                'demo-corporate-2-pricing.html',
                'demo-corporate-2-insights.html',
                'demo-corporate-2-article.html',
                'demo-corporate-2-faq.html',
                'demo-corporate-2-contact.html',
            ],
            theme: 'demo-corporate-2',
            thumbnail: 'screenshots',
            presets: CORPORATE_2_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'corporate-3',
            name: 'Corporate Services',
            categories: ['business', 'consulting'],
            page: 'demo-corporate-3.html',
            pages: [
                'demo-corporate-3.html',
                'demo-corporate-3-about.html',
                'demo-corporate-3-leadership.html',
                'demo-corporate-3-careers.html',
                'demo-corporate-3-services.html',
                'demo-corporate-3-service.html',
                'demo-corporate-3-industries.html',
                'demo-corporate-3-pricing.html',
                'demo-corporate-3-testimonials.html',
                'demo-corporate-3-blog.html',
                'demo-corporate-3-article.html',
                'demo-corporate-3-contact.html',
                'demo-corporate-3-quote.html',
            ],
            theme: 'demo-corporate-3',
            thumbnail: 'screenshots',
            presets: CORPORATE_3_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'corporate-4',
            name: 'Enterprise Transformation',
            categories: ['business', 'consulting'],
            page: 'demo-corporate-4.html',
            pages: [
                'demo-corporate-4.html',
                'demo-corporate-4-capabilities.html',
                'demo-corporate-4-capability.html',
                'demo-corporate-4-industries.html',
                'demo-corporate-4-work.html',
                'demo-corporate-4-case-study.html',
                'demo-corporate-4-insights.html',
                'demo-corporate-4-article.html',
                'demo-corporate-4-about.html',
                'demo-corporate-4-leadership.html',
                'demo-corporate-4-careers.html',
                'demo-corporate-4-contact.html',
            ],
            theme: 'demo-corporate-4',
            thumbnail: 'screenshots',
            presets: CORPORATE_4_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'corporate-5',
            name: 'Strategy Firm',
            categories: ['business', 'consulting'],
            page: 'demo-corporate-5.html',
            pages: [
                'demo-corporate-5.html',
                'demo-corporate-5-firm.html',
                'demo-corporate-5-leadership.html',
                'demo-corporate-5-partner.html',
                'demo-corporate-5-practices.html',
                'demo-corporate-5-practice.html',
                'demo-corporate-5-mandates.html',
                'demo-corporate-5-mandate.html',
                'demo-corporate-5-perspectives.html',
                'demo-corporate-5-article.html',
                'demo-corporate-5-careers.html',
                'demo-corporate-5-offices.html',
                'demo-corporate-5-contact.html',
            ],
            theme: 'demo-corporate-5',
            thumbnail: 'screenshots',
            presets: CORPORATE_5_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'corporate-6',
            name: 'Professional Services',
            categories: ['business'],
            page: 'demo-corporate-6.html',
            pages: [
                'demo-corporate-6.html',
                'demo-corporate-6-about.html',
                'demo-corporate-6-leadership.html',
                'demo-corporate-6-offices.html',
                'demo-corporate-6-careers.html',
                'demo-corporate-6-services.html',
                'demo-corporate-6-service.html',
                'demo-corporate-6-industries.html',
                'demo-corporate-6-insights.html',
                'demo-corporate-6-article.html',
                'demo-corporate-6-contact.html',
            ],
            theme: 'demo-corporate-6',
            thumbnail: 'screenshots',
            presets: CORPORATE_6_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'corporate-7',
            name: 'Risk & Compliance',
            categories: ['business'],
            page: 'demo-corporate-7.html',
            pages: [
                'demo-corporate-7.html',
                'demo-corporate-7-about.html',
                'demo-corporate-7-leadership.html',
                'demo-corporate-7-careers.html',
                'demo-corporate-7-services.html',
                'demo-corporate-7-service.html',
                'demo-corporate-7-sectors.html',
                'demo-corporate-7-case-studies.html',
                'demo-corporate-7-case-study.html',
                'demo-corporate-7-resources.html',
                'demo-corporate-7-contact.html',
            ],
            theme: 'demo-corporate-7',
            thumbnail: 'screenshots',
            presets: CORPORATE_7_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'consulting-2',
            name: 'Growth Consulting',
            categories: ['business', 'consulting'],
            page: 'demo-consulting-2.html',
            pages: [
                'demo-consulting-2.html',
                'demo-consulting-2-about.html',
                'demo-consulting-2-team.html',
                'demo-consulting-2-careers.html',
                'demo-consulting-2-services.html',
                'demo-consulting-2-service.html',
                'demo-consulting-2-results.html',
                'demo-consulting-2-approach.html',
                'demo-consulting-2-insights.html',
                'demo-consulting-2-article.html',
                'demo-consulting-2-contact.html',
            ],
            theme: 'demo-consulting-2',
            thumbnail: 'screenshots',
            presets: CONSULTING_2_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'consulting-3',
            name: 'People & Organisation',
            categories: ['business', 'consulting'],
            page: 'demo-consulting-3.html',
            pages: [
                'demo-consulting-3.html',
                'demo-consulting-3-about.html',
                'demo-consulting-3-team.html',
                'demo-consulting-3-careers.html',
                'demo-consulting-3-services.html',
                'demo-consulting-3-service.html',
                'demo-consulting-3-programs.html',
                'demo-consulting-3-stories.html',
                'demo-consulting-3-blog.html',
                'demo-consulting-3-article.html',
                'demo-consulting-3-contact.html',
            ],
            theme: 'demo-consulting-3',
            thumbnail: 'screenshots',
            presets: CONSULTING_3_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'news-1',
            name: 'Daily News',
            categories: ['blog'],
            page: 'demo-news-1.html',
            pages: [
                'demo-news-1.html',
                'demo-news-1-section.html',
                'demo-news-1-article.html',
                'demo-news-1-author.html',
                'demo-news-1-latest.html',
                'demo-news-1-opinion.html',
                'demo-news-1-newsletters.html',
                'demo-news-1-about.html',
                'demo-news-1-contact.html',
            ],
            theme: 'demo-news-1',
            thumbnail: 'screenshots',
            presets: NEWS_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'magazine-1',
            name: 'Lifestyle Magazine',
            categories: ['blog'],
            page: 'demo-magazine-1.html',
            pages: [
                'demo-magazine-1.html',
                'demo-magazine-1-category.html',
                'demo-magazine-1-article.html',
                'demo-magazine-1-author.html',
                'demo-magazine-1-issues.html',
                'demo-magazine-1-issue.html',
                'demo-magazine-1-about.html',
                'demo-magazine-1-contact.html',
            ],
            theme: 'demo-magazine-1',
            thumbnail: 'screenshots',
            presets: MAGAZINE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'blog-1',
            name: 'Personal Blog',
            categories: ['blog'],
            page: 'demo-blog-1.html',
            pages: [
                'demo-blog-1.html',
                'demo-blog-1-blog.html',
                'demo-blog-1-article.html',
                'demo-blog-1-recipes.html',
                'demo-blog-1-travel.html',
                'demo-blog-1-about.html',
                'demo-blog-1-contact.html',
            ],
            theme: 'demo-blog-1',
            thumbnail: 'screenshots',
            presets: BLOG_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'travel-blog-1',
            name: 'Travel Blog',
            categories: ['blog'],
            page: 'demo-travel-blog-1.html',
            pages: [
                'demo-travel-blog-1.html',
                'demo-travel-blog-1-destinations.html',
                'demo-travel-blog-1-destination.html',
                'demo-travel-blog-1-itineraries.html',
                'demo-travel-blog-1-itinerary.html',
                'demo-travel-blog-1-guides.html',
                'demo-travel-blog-1-photo-essays.html',
                'demo-travel-blog-1-about.html',
                'demo-travel-blog-1-contact.html',
            ],
            theme: 'demo-travel-blog-1',
            thumbnail: 'screenshots',
            presets: TRAVEL_BLOG_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'tech-blog-1',
            name: 'Tech & Reviews',
            categories: ['blog', 'technology'],
            page: 'demo-tech-blog-1.html',
            pages: [
                'demo-tech-blog-1.html',
                'demo-tech-blog-1-news.html',
                'demo-tech-blog-1-reviews.html',
                'demo-tech-blog-1-review.html',
                'demo-tech-blog-1-guides.html',
                'demo-tech-blog-1-deals.html',
                'demo-tech-blog-1-podcast.html',
                'demo-tech-blog-1-article.html',
                'demo-tech-blog-1-author.html',
                'demo-tech-blog-1-about.html',
                'demo-tech-blog-1-contact.html',
            ],
            theme: 'demo-tech-blog-1',
            thumbnail: 'screenshots',
            presets: TECH_BLOG_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: false, hide: [] },
        },
        {
            id: 'auto-services-1',
            name: 'Auto Services',
            categories: ['industry', 'business'],
            page: 'demo-auto-services-1.html',
            pages: [
                'demo-auto-services-1.html',
                'demo-auto-services-1-services.html',
                'demo-auto-services-1-service.html',
                'demo-auto-services-1-pricing.html',
                'demo-auto-services-1-about.html',
                'demo-auto-services-1-reviews.html',
                'demo-auto-services-1-contact.html',
                'demo-auto-services-1-book.html',
            ],
            theme: 'demo-auto-services-1',
            thumbnail: 'screenshots',
            presets: AUTO_SERVICES_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'logistics-1',
            name: 'Logistics & Freight',
            categories: ['business', 'industry'],
            page: 'demo-logistics-1.html',
            pages: [
                'demo-logistics-1.html',
                'demo-logistics-1-services.html',
                'demo-logistics-1-service.html',
                'demo-logistics-1-industries.html',
                'demo-logistics-1-tracking.html',
                'demo-logistics-1-quote.html',
                'demo-logistics-1-about.html',
                'demo-logistics-1-network.html',
                'demo-logistics-1-careers.html',
                'demo-logistics-1-news.html',
                'demo-logistics-1-article.html',
                'demo-logistics-1-contact.html',
            ],
            theme: 'demo-logistics-1',
            thumbnail: 'screenshots',
            presets: LOGISTICS_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'city-hotel-1',
            name: 'City Hotel',
            categories: ['hospitality'],
            page: 'demo-city-hotel-1.html',
            pages: [
                'demo-city-hotel-1.html',
                'demo-city-hotel-1-rooms.html',
                'demo-city-hotel-1-room.html',
                'demo-city-hotel-1-cafe.html',
                'demo-city-hotel-1-rooftop.html',
                'demo-city-hotel-1-neighbourhood.html',
                'demo-city-hotel-1-blog.html',
                'demo-city-hotel-1-article.html',
                'demo-city-hotel-1-about.html',
                'demo-city-hotel-1-contact.html',
                'demo-city-hotel-1-book.html',
            ],
            theme: 'demo-city-hotel-1',
            thumbnail: 'screenshots',
            presets: CITY_HOTEL_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'aparthotel-1',
            name: 'Aparthotel',
            categories: ['hospitality'],
            page: 'demo-aparthotel-1.html',
            pages: [
                'demo-aparthotel-1.html',
                'demo-aparthotel-1-apartments.html',
                'demo-aparthotel-1-apartment.html',
                'demo-aparthotel-1-long-stays.html',
                'demo-aparthotel-1-neighbourhood.html',
                'demo-aparthotel-1-amenities.html',
                'demo-aparthotel-1-about.html',
                'demo-aparthotel-1-contact.html',
                'demo-aparthotel-1-book.html',
            ],
            theme: 'demo-aparthotel-1',
            thumbnail: 'screenshots',
            presets: APARTHOTEL_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'photographer-1',
            name: 'Photographer',
            categories: ['portfolio'],
            page: 'demo-photographer-1.html',
            pages: [
                'demo-photographer-1.html',
                'demo-photographer-1-work.html',
                'demo-photographer-1-series.html',
                'demo-photographer-1-services.html',
                'demo-photographer-1-about.html',
                'demo-photographer-1-blog.html',
                'demo-photographer-1-article.html',
                'demo-photographer-1-contact.html',
            ],
            theme: 'demo-photographer-1',
            thumbnail: 'screenshots',
            presets: PHOTOGRAPHER_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: false, hide: [] },
        },
        {
            id: 'product-designer-1',
            name: 'Product Designer',
            categories: ['portfolio'],
            page: 'demo-product-designer-1.html',
            pages: [
                'demo-product-designer-1.html',
                'demo-product-designer-1-work.html',
                'demo-product-designer-1-case-study.html',
                'demo-product-designer-1-process.html',
                'demo-product-designer-1-about.html',
                'demo-product-designer-1-writing.html',
                'demo-product-designer-1-article.html',
                'demo-product-designer-1-contact.html',
            ],
            theme: 'demo-product-designer-1',
            thumbnail: 'screenshots',
            presets: PRODUCT_DESIGNER_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'developer-1',
            name: 'Creative Developer',
            categories: ['portfolio'],
            page: 'demo-developer-1.html',
            pages: [
                'demo-developer-1.html',
                'demo-developer-1-work.html',
                'demo-developer-1-project.html',
                'demo-developer-1-lab.html',
                'demo-developer-1-stack.html',
                'demo-developer-1-about.html',
                'demo-developer-1-contact.html',
            ],
            theme: 'demo-developer-1',
            thumbnail: 'screenshots',
            presets: DEVELOPER_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'illustrator-1',
            name: 'Illustrator',
            categories: ['portfolio'],
            page: 'demo-illustrator-1.html',
            pages: [
                'demo-illustrator-1.html',
                'demo-illustrator-1-work.html',
                'demo-illustrator-1-project.html',
                'demo-illustrator-1-process.html',
                'demo-illustrator-1-about.html',
                'demo-illustrator-1-contact.html',
            ],
            theme: 'demo-illustrator-1',
            thumbnail: 'screenshots',
            presets: ILLUSTRATOR_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'creative-director-1',
            name: 'Creative Director',
            categories: ['portfolio'],
            page: 'demo-creative-director-1.html',
            pages: [
                'demo-creative-director-1.html',
                'demo-creative-director-1-work.html',
                'demo-creative-director-1-project.html',
                'demo-creative-director-1-films.html',
                'demo-creative-director-1-about.html',
                'demo-creative-director-1-awards.html',
                'demo-creative-director-1-contact.html',
            ],
            theme: 'demo-creative-director-1',
            thumbnail: 'screenshots',
            presets: CREATIVE_DIRECTOR_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'motion-designer-1',
            name: 'Motion Designer',
            categories: ['portfolio'],
            page: 'demo-motion-designer-1.html',
            pages: [
                'demo-motion-designer-1.html',
                'demo-motion-designer-1-work.html',
                'demo-motion-designer-1-project.html',
                'demo-motion-designer-1-project-soft-machine.html',
                'demo-motion-designer-1-project-liquid-chrome.html',
                'demo-motion-designer-1-project-still-water.html',
                'demo-motion-designer-1-services.html',
                'demo-motion-designer-1-about.html',
                'demo-motion-designer-1-playground.html',
                'demo-motion-designer-1-blog.html',
                'demo-motion-designer-1-article.html',
                'demo-motion-designer-1-contact.html',
            ],
            theme: 'demo-motion-designer-1',
            thumbnail: 'screenshots',
            presets: MOTION_DESIGNER_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'financial-planner-1',
            name: 'Financial Planner',
            categories: ['business'],
            page: 'demo-financial-planner-1.html',
            pages: [
                'demo-financial-planner-1.html',
                'demo-financial-planner-1-planning.html',
                'demo-financial-planner-1-service.html',
                'demo-financial-planner-1-how-we-work.html',
                'demo-financial-planner-1-fees.html',
                'demo-financial-planner-1-about.html',
                'demo-financial-planner-1-team.html',
                'demo-financial-planner-1-insights.html',
                'demo-financial-planner-1-article.html',
                'demo-financial-planner-1-contact.html',
            ],
            theme: 'demo-financial-planner-1',
            thumbnail: 'screenshots',
            presets: FINANCIAL_PLANNER_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'tax-advisor-1',
            name: 'Tax Advisor',
            categories: ['business'],
            page: 'demo-tax-advisor-1.html',
            pages: [
                'demo-tax-advisor-1.html',
                'demo-tax-advisor-1-services.html',
                'demo-tax-advisor-1-service.html',
                'demo-tax-advisor-1-business.html',
                'demo-tax-advisor-1-pricing.html',
                'demo-tax-advisor-1-tax-calendar.html',
                'demo-tax-advisor-1-about.html',
                'demo-tax-advisor-1-resources.html',
                'demo-tax-advisor-1-article.html',
                'demo-tax-advisor-1-contact.html',
            ],
            theme: 'demo-tax-advisor-1',
            thumbnail: 'screenshots',
            presets: TAX_ADVISOR_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'business-loans-1',
            name: 'Business Loans',
            categories: ['business'],
            page: 'demo-business-loans-1.html',
            pages: [
                'demo-business-loans-1.html',
                'demo-business-loans-1-loans.html',
                'demo-business-loans-1-loan.html',
                'demo-business-loans-1-how-it-works.html',
                'demo-business-loans-1-rates.html',
                'demo-business-loans-1-industries.html',
                'demo-business-loans-1-about.html',
                'demo-business-loans-1-resources.html',
                'demo-business-loans-1-article.html',
                'demo-business-loans-1-contact.html',
                'demo-business-loans-1-apply.html',
            ],
            theme: 'demo-business-loans-1',
            thumbnail: 'screenshots',
            presets: BUSINESS_LOANS_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'insurance-1',
            name: 'Insurance',
            categories: ['business'],
            page: 'demo-insurance-1.html',
            pages: [
                'demo-insurance-1.html',
                'demo-insurance-1-personal.html',
                'demo-insurance-1-business.html',
                'demo-insurance-1-coverage.html',
                'demo-insurance-1-quote.html',
                'demo-insurance-1-claims.html',
                'demo-insurance-1-agents.html',
                'demo-insurance-1-about.html',
                'demo-insurance-1-resources.html',
                'demo-insurance-1-article.html',
                'demo-insurance-1-faq.html',
                'demo-insurance-1-contact.html',
            ],
            theme: 'demo-insurance-1',
            thumbnail: 'screenshots',
            presets: INSURANCE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'electronics-store-1',
            name: 'Electronics Store',
            categories: ['shop'],
            page: 'demo-electronics-store-1.html',
            pages: [
                'demo-electronics-store-1.html',
                'demo-electronics-store-1-shop.html',
                'demo-electronics-store-1-departments.html',
                'demo-electronics-store-1-product.html',
                'demo-electronics-store-1-deals.html',
                'demo-electronics-store-1-brands.html',
                'demo-electronics-store-1-cart.html',
                'demo-electronics-store-1-checkout.html',
                'demo-electronics-store-1-track-order.html',
                'demo-electronics-store-1-account.html',
                'demo-electronics-store-1-support.html',
                'demo-electronics-store-1-blog.html',
                'demo-electronics-store-1-contact.html',
                'demo-electronics-store-1-about.html',
            ],
            theme: 'demo-electronics-store-1',
            thumbnail: 'screenshots',
            presets: ELECTRONICS_STORE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'fashion-store-1',
            name: 'Fashion Store',
            categories: ['shop'],
            page: 'demo-fashion-store-1.html',
            pages: [
                'demo-fashion-store-1.html',
                'demo-fashion-store-1-shop.html',
                'demo-fashion-store-1-the-edit.html',
                'demo-fashion-store-1-product.html',
                'demo-fashion-store-1-wishlist.html',
                'demo-fashion-store-1-account.html',
                'demo-fashion-store-1-cart.html',
                'demo-fashion-store-1-checkout.html',
                'demo-fashion-store-1-about.html',
                'demo-fashion-store-1-stores.html',
                'demo-fashion-store-1-blog.html',
            ],
            theme: 'demo-fashion-store-1',
            thumbnail: 'screenshots',
            presets: FASHION_STORE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'jewelry-store-1',
            name: 'Jewelry Store',
            categories: ['shop'],
            page: 'demo-jewelry-store-1.html',
            pages: [
                'demo-jewelry-store-1.html',
                'demo-jewelry-store-1-shop.html',
                'demo-jewelry-store-1-collections.html',
                'demo-jewelry-store-1-product.html',
                'demo-jewelry-store-1-product-studio.html',
                'demo-jewelry-store-1-wishlist.html',
                'demo-jewelry-store-1-cart.html',
                'demo-jewelry-store-1-checkout.html',
                'demo-jewelry-store-1-bridal.html',
                'demo-jewelry-store-1-about.html',
                'demo-jewelry-store-1-appointment.html',
                'demo-jewelry-store-1-blog.html',
            ],
            theme: 'demo-jewelry-store-1',
            thumbnail: 'screenshots',
            presets: JEWELRY_STORE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'grocery-store-1',
            name: 'Grocery Store',
            categories: ['shop'],
            page: 'demo-grocery-store-1.html',
            pages: [
                'demo-grocery-store-1.html',
                'demo-grocery-store-1-shop.html',
                'demo-grocery-store-1-aisle.html',
                'demo-grocery-store-1-deals.html',
                'demo-grocery-store-1-product.html',
                'demo-grocery-store-1-recipe.html',
                'demo-grocery-store-1-cart.html',
                'demo-grocery-store-1-checkout.html',
                'demo-grocery-store-1-order-complete.html',
                'demo-grocery-store-1-recipes.html',
                'demo-grocery-store-1-delivery-areas.html',
                'demo-grocery-store-1-contact.html',
                'demo-grocery-store-1-about.html',
            ],
            theme: 'demo-grocery-store-1',
            thumbnail: 'screenshots',
            presets: GROCERY_STORE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'furniture-store-1',
            name: 'Furniture Store',
            categories: ['shop'],
            page: 'demo-furniture-store-1.html',
            pages: [
                'demo-furniture-store-1.html',
                'demo-furniture-store-1-shop.html',
                'demo-furniture-store-1-sofas.html',
                'demo-furniture-store-1-lighting.html',
                'demo-furniture-store-1-product.html',
                'demo-furniture-store-1-product-accordion.html',
                'demo-furniture-store-1-product-split.html',
                'demo-furniture-store-1-rooms.html',
                'demo-furniture-store-1-cart.html',
                'demo-furniture-store-1-account.html',
                'demo-furniture-store-1-inspiration.html',
                'demo-furniture-store-1-showrooms.html',
                'demo-furniture-store-1-about.html',
                'demo-furniture-store-1-contact.html',
            ],
            theme: 'demo-furniture-store-1',
            thumbnail: 'screenshots',
            presets: FURNITURE_STORE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'beauty-store-1',
            name: 'Beauty Store',
            categories: ['shop'],
            page: 'demo-beauty-store-1.html',
            pages: [
                'demo-beauty-store-1.html',
                'demo-beauty-store-1-shop.html',
                'demo-beauty-store-1-sets-gifts.html',
                'demo-beauty-store-1-product.html',
                'demo-beauty-store-1-cart.html',
                'demo-beauty-store-1-checkout.html',
                'demo-beauty-store-1-wishlist.html',
                'demo-beauty-store-1-account.html',
                'demo-beauty-store-1-skin-quiz.html',
                'demo-beauty-store-1-ingredients.html',
                'demo-beauty-store-1-about.html',
                'demo-beauty-store-1-blog.html',
                'demo-beauty-store-1-contact.html',
            ],
            theme: 'demo-beauty-store-1',
            thumbnail: 'screenshots',
            presets: BEAUTY_STORE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'pet-store-1',
            name: 'Pet Store',
            categories: ['shop'],
            page: 'demo-pet-store-1.html',
            pages: [
                'demo-pet-store-1.html',
                'demo-pet-store-1-shop.html',
                'demo-pet-store-1-deals.html',
                'demo-pet-store-1-product.html',
                'demo-pet-store-1-cart.html',
                'demo-pet-store-1-checkout.html',
                'demo-pet-store-1-track-order.html',
                'demo-pet-store-1-account.html',
                'demo-pet-store-1-autoship.html',
                'demo-pet-store-1-vet-advice.html',
                'demo-pet-store-1-store.html',
                'demo-pet-store-1-contact.html',
                'demo-pet-store-1-about.html',
            ],
            theme: 'demo-pet-store-1',
            thumbnail: 'screenshots',
            presets: PET_STORE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'kids-store-1',
            name: 'Kids Store',
            categories: ['shop'],
            page: 'demo-kids-store-1.html',
            pages: [
                'demo-kids-store-1.html',
                'demo-kids-store-1-shop.html',
                'demo-kids-store-1-shop-by-age.html',
                'demo-kids-store-1-product.html',
                'demo-kids-store-1-wishlist.html',
                'demo-kids-store-1-cart.html',
                'demo-kids-store-1-checkout.html',
                'demo-kids-store-1-order-complete.html',
                'demo-kids-store-1-gift-finder.html',
                'demo-kids-store-1-our-story.html',
                'demo-kids-store-1-blog.html',
                'demo-kids-store-1-contact.html',
            ],
            theme: 'demo-kids-store-1',
            thumbnail: 'screenshots',
            presets: KIDS_STORE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'outdoor-store-1',
            name: 'Outdoor Store',
            categories: ['shop'],
            page: 'demo-outdoor-store-1.html',
            pages: [
                'demo-outdoor-store-1.html',
                'demo-outdoor-store-1-shop.html',
                'demo-outdoor-store-1-edc.html',
                'demo-outdoor-store-1-product.html',
                'demo-outdoor-store-1-cart.html',
                'demo-outdoor-store-1-checkout.html',
                'demo-outdoor-store-1-track-order.html',
                'demo-outdoor-store-1-account-login.html',
                'demo-outdoor-store-1-account.html',
                'demo-outdoor-store-1-activities.html',
                'demo-outdoor-store-1-guides.html',
                'demo-outdoor-store-1-repairs.html',
                'demo-outdoor-store-1-store.html',
                'demo-outdoor-store-1-about.html',
            ],
            theme: 'demo-outdoor-store-1',
            thumbnail: 'screenshots',
            presets: OUTDOOR_STORE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'sneaker-store-1',
            name: 'Sneaker Store',
            categories: ['shop'],
            page: 'demo-sneaker-store-1.html',
            pages: [
                'demo-sneaker-store-1.html',
                'demo-sneaker-store-1-shop.html',
                'demo-sneaker-store-1-product.html',
                'demo-sneaker-store-1-cart.html',
                'demo-sneaker-store-1-checkout.html',
                'demo-sneaker-store-1-order-complete.html',
                'demo-sneaker-store-1-account.html',
                'demo-sneaker-store-1-launches.html',
                'demo-sneaker-store-1-brands.html',
                'demo-sneaker-store-1-store.html',
                'demo-sneaker-store-1-blog.html',
                'demo-sneaker-store-1-lookbook.html',
                'demo-sneaker-store-1-about.html',
            ],
            theme: 'demo-sneaker-store-1',
            thumbnail: 'screenshots',
            presets: SNEAKER_STORE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'fashion-store-2',
            name: 'Casual Fashion Store',
            categories: ['shop'],
            page: 'demo-fashion-store-2.html',
            pages: [
                'demo-fashion-store-2.html',
                'demo-fashion-store-2-shop.html',
                'demo-fashion-store-2-new-in.html',
                'demo-fashion-store-2-product.html',
                'demo-fashion-store-2-cart.html',
                'demo-fashion-store-2-checkout.html',
                'demo-fashion-store-2-order-complete.html',
                'demo-fashion-store-2-wishlist.html',
                'demo-fashion-store-2-account.html',
                'demo-fashion-store-2-denim-fit-guide.html',
                'demo-fashion-store-2-about.html',
                'demo-fashion-store-2-stores.html',
                'demo-fashion-store-2-blog.html',
                'demo-fashion-store-2-blog-post.html',
            ],
            theme: 'demo-fashion-store-2',
            thumbnail: 'screenshots',
            presets: FASHION_STORE_2_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'activewear-store-1',
            name: 'Activewear Store',
            categories: ['shop'],
            page: 'demo-activewear-store-1.html',
            pages: [
                'demo-activewear-store-1.html',
                'demo-activewear-store-1-shop.html',
                'demo-activewear-store-1-activities.html',
                'demo-activewear-store-1-product.html',
                'demo-activewear-store-1-cart.html',
                'demo-activewear-store-1-checkout.html',
                'demo-activewear-store-1-order-complete.html',
                'demo-activewear-store-1-account.html',
                'demo-activewear-store-1-size-guide.html',
                'demo-activewear-store-1-run-club.html',
                'demo-activewear-store-1-blog.html',
                'demo-activewear-store-1-article.html',
                'demo-activewear-store-1-about.html',
            ],
            theme: 'demo-activewear-store-1',
            thumbnail: 'screenshots',
            presets: ACTIVEWEAR_STORE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'makeup-store-1',
            name: 'Makeup Store',
            categories: ['shop'],
            page: 'demo-makeup-store-1.html',
            pages: [
                'demo-makeup-store-1.html',
                'demo-makeup-store-1-shop.html',
                'demo-makeup-store-1-lips.html',
                'demo-makeup-store-1-product.html',
                'demo-makeup-store-1-cart.html',
                'demo-makeup-store-1-checkout.html',
                'demo-makeup-store-1-order-complete.html',
                'demo-makeup-store-1-wishlist.html',
                'demo-makeup-store-1-account.html',
                'demo-makeup-store-1-shade-finder.html',
                'demo-makeup-store-1-tutorials.html',
                'demo-makeup-store-1-tutorial.html',
                'demo-makeup-store-1-makeover.html',
                'demo-makeup-store-1-about.html',
            ],
            theme: 'demo-makeup-store-1',
            thumbnail: 'screenshots',
            presets: MAKEUP_STORE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'subtle',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'handmade-store-1',
            name: 'Handmade Store',
            categories: ['shop'],
            page: 'demo-handmade-store-1.html',
            pages: [
                'demo-handmade-store-1.html',
                'demo-handmade-store-1-shop.html',
                'demo-handmade-store-1-product.html',
                'demo-handmade-store-1-cart.html',
                'demo-handmade-store-1-checkout.html',
                'demo-handmade-store-1-order-complete.html',
                'demo-handmade-store-1-wishlist.html',
                'demo-handmade-store-1-account.html',
                'demo-handmade-store-1-makers.html',
                'demo-handmade-store-1-maker.html',
                'demo-handmade-store-1-workshops.html',
                'demo-handmade-store-1-gift-guide.html',
                'demo-handmade-store-1-blog.html',
                'demo-handmade-store-1-blog-post.html',
                'demo-handmade-store-1-about.html',
            ],
            theme: 'demo-handmade-store-1',
            thumbnail: 'screenshots',
            presets: HANDMADE_STORE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'auto-parts-store-1',
            name: 'Auto Parts Store',
            categories: ['shop'],
            page: 'demo-auto-parts-store-1.html',
            pages: [
                'demo-auto-parts-store-1.html',
                'demo-auto-parts-store-1-shop.html',
                'demo-auto-parts-store-1-categories.html',
                'demo-auto-parts-store-1-product.html',
                'demo-auto-parts-store-1-cart.html',
                'demo-auto-parts-store-1-checkout.html',
                'demo-auto-parts-store-1-order-complete.html',
                'demo-auto-parts-store-1-track-order.html',
                'demo-auto-parts-store-1-account.html',
                'demo-auto-parts-store-1-find-by-vehicle.html',
                'demo-auto-parts-store-1-brands.html',
                'demo-auto-parts-store-1-deals.html',
                'demo-auto-parts-store-1-help.html',
                'demo-auto-parts-store-1-about.html',
            ],
            theme: 'demo-auto-parts-store-1',
            thumbnail: 'screenshots',
            presets: AUTO_SERVICES_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'furniture-store-2',
            name: 'Modern Furniture Store',
            categories: ['shop'],
            page: 'demo-furniture-store-2.html',
            pages: [
                'demo-furniture-store-2.html',
                'demo-furniture-store-2-shop.html',
                'demo-furniture-store-2-sale.html',
                'demo-furniture-store-2-product.html',
                'demo-furniture-store-2-cart.html',
                'demo-furniture-store-2-checkout.html',
                'demo-furniture-store-2-order-complete.html',
                'demo-furniture-store-2-wishlist.html',
                'demo-furniture-store-2-rooms.html',
                'demo-furniture-store-2-about.html',
                'demo-furniture-store-2-contact.html',
                'demo-furniture-store-2-blog.html',
                'demo-furniture-store-2-blog-post.html',
            ],
            theme: 'demo-furniture-store-2',
            thumbnail: 'screenshots',
            presets: FURNITURE_STORE_2_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'megastore-1',
            name: 'Megastore',
            categories: ['shop'],
            page: 'demo-megastore-1.html',
            pages: [
                'demo-megastore-1.html',
                'demo-megastore-1-about.html',
                'demo-megastore-1-shop.html',
                'demo-megastore-1-departments.html',
                'demo-megastore-1-product.html',
                'demo-megastore-1-deals.html',
                'demo-megastore-1-weekly-ad.html',
                'demo-megastore-1-stores.html',
                'demo-megastore-1-membership.html',
                'demo-megastore-1-help.html',
                'demo-megastore-1-cart.html',
                'demo-megastore-1-cart-empty.html',
                'demo-megastore-1-checkout.html',
                'demo-megastore-1-order-complete.html',
                'demo-megastore-1-track-order.html',
                'demo-megastore-1-account.html',
            ],
            theme: 'demo-megastore-1',
            thumbnail: 'screenshots',
            presets: MEGASTORE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'tech-accessories-store-1',
            name: 'Tech Accessories Store',
            categories: ['shop'],
            page: 'demo-tech-accessories-store-1.html',
            pages: [
                'demo-tech-accessories-store-1.html',
                'demo-tech-accessories-store-1-shop.html',
                'demo-tech-accessories-store-1-devices.html',
                'demo-tech-accessories-store-1-product.html',
                'demo-tech-accessories-store-1-cart.html',
                'demo-tech-accessories-store-1-checkout.html',
                'demo-tech-accessories-store-1-order-complete.html',
                'demo-tech-accessories-store-1-account.html',
                'demo-tech-accessories-store-1-find-my-device.html',
                'demo-tech-accessories-store-1-warranty.html',
                'demo-tech-accessories-store-1-blog.html',
                'demo-tech-accessories-store-1-contact.html',
                'demo-tech-accessories-store-1-about.html',
            ],
            theme: 'demo-tech-accessories-store-1',
            thumbnail: 'screenshots',
            presets: TECH_ACCESSORIES_STORE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'skincare-store-1',
            name: 'Skincare Store',
            categories: ['shop'],
            page: 'demo-skincare-store-1.html',
            pages: [
                'demo-skincare-store-1.html',
                'demo-skincare-store-1-shop.html',
                'demo-skincare-store-1-concerns.html',
                'demo-skincare-store-1-product.html',
                'demo-skincare-store-1-routine.html',
                'demo-skincare-store-1-ingredients.html',
                'demo-skincare-store-1-skin-quiz.html',
                'demo-skincare-store-1-about.html',
                'demo-skincare-store-1-blog.html',
                'demo-skincare-store-1-article.html',
                'demo-skincare-store-1-contact.html',
                'demo-skincare-store-1-cart.html',
                'demo-skincare-store-1-checkout.html',
                'demo-skincare-store-1-order-complete.html',
                'demo-skincare-store-1-account.html',
                'demo-skincare-store-1-wishlist.html',
            ],
            theme: 'demo-skincare-store-1',
            thumbnail: 'screenshots',
            presets: SKINCARE_STORE_1_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'round',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'fashion-store-3',
            name: 'Designer Fashion Store',
            categories: ['shop'],
            page: 'demo-fashion-store-3.html',
            pages: [
                'demo-fashion-store-3.html',
                'demo-fashion-store-3-women.html',
                'demo-fashion-store-3-men.html',
                'demo-fashion-store-3-designers.html',
                'demo-fashion-store-3-new-in.html',
                'demo-fashion-store-3-product.html',
                'demo-fashion-store-3-edit.html',
                'demo-fashion-store-3-story.html',
                'demo-fashion-store-3-about.html',
                'demo-fashion-store-3-stores.html',
                'demo-fashion-store-3-contact.html',
                'demo-fashion-store-3-cart.html',
                'demo-fashion-store-3-checkout.html',
                'demo-fashion-store-3-order-complete.html',
                'demo-fashion-store-3-account.html',
                'demo-fashion-store-3-wishlist.html',
                'demo-fashion-store-3-track-order.html',
            ],
            theme: 'demo-fashion-store-3',
            thumbnail: 'screenshots',
            presets: FASHION_STORE_3_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'default',
            switcher: { scheme: true, hide: [] },
        },
        {
            id: 'jewelry-store-2',
            name: 'Fine Jewelry Store',
            categories: ['shop'],
            page: 'demo-jewelry-store-2.html',
            pages: [
                'demo-jewelry-store-2.html',
                'demo-jewelry-store-2-rings.html',
                'demo-jewelry-store-2-earrings.html',
                'demo-jewelry-store-2-necklaces.html',
                'demo-jewelry-store-2-bracelets.html',
                'demo-jewelry-store-2-product.html',
                'demo-jewelry-store-2-design-your-ring.html',
                'demo-jewelry-store-2-bridal.html',
                'demo-jewelry-store-2-ring-sizer.html',
                'demo-jewelry-store-2-about.html',
                'demo-jewelry-store-2-appointments.html',
                'demo-jewelry-store-2-contact.html',
                'demo-jewelry-store-2-blog.html',
                'demo-jewelry-store-2-article.html',
                'demo-jewelry-store-2-cart.html',
                'demo-jewelry-store-2-checkout.html',
                'demo-jewelry-store-2-order-complete.html',
                'demo-jewelry-store-2-account.html',
                'demo-jewelry-store-2-wishlist.html',
            ],
            theme: 'demo-jewelry-store-2',
            thumbnail: 'screenshots',
            presets: JEWELRY_STORE_2_PRESETS,
            shapes: ['square', 'subtle', 'default', 'round'],
            shape: 'square',
            switcher: { scheme: true, hide: [] },
        },
    ]);

    /** The Buttons shape (controls.js 'buttons') that goes with each corner stop: buttons
        have their own radius and ignore the corner scale, so a Demos card sets both. */
    const CORNER_BUTTONS = Object.freeze({
        square: 'square',
        subtle: 'rounded',
        default: 'rounded',
        round: 'pill',
    });

    /**
     * scales.js — The numbers the brand colour scales are made of, and each colour
     * role as a CSS formula and as a number.
     *
     * tokens.css derives every brand colour's 50–950 steps, hover, readable text
     * (-ink) and text on the fill (on-) from its seed with relative colour syntax;
     * apps/html/scripts/theme/brand-scales.mjs writes those blocks from this file.
     * The Style Switcher computes the same roles in JS (color.js): the numeric form
     * of a role mirrors its CSS formula, so a value written as a hex matches what
     * the formula renders. Lightness is OKLCH L, 0–1.
     */

    /** Text on a fill: white, or #232323 (lightness DARK_TEXT_L) on fills from ON_THRESHOLD up. */
    const LIGHT_TEXT = '#ffffff';
    const DARK_TEXT = '#232323';

    /**
     * color.js — Colour maths for the Style Switcher.
     *
     * Parses hex, rgb() and oklch() colours; converts sRGB ↔ OKLab ↔ OKLCH with
     * Björn Ottosson's matrices (https://bottosson.github.io/posts/oklab/); maps
     * colours outside sRGB back in by reducing their chroma at the same lightness
     * and hue; measures WCAG 2 contrast; and computes the colours the switcher
     * writes beside a brand seed: readable text (-ink), text on the fill (on-) and
     * the hover tokens.css derives (scales.js). Colours are sRGB channels 0–1
     * ([r, g, b]) or CSS strings; results are '#rrggbb'.
     */

    /** sRGB channels this far outside 0–1 still count as inside (float noise). */
    const GAMUT_EPSILON = 1e-6;
    const CHROMA_PRECISION = 1e-6;

    /** Longer than any colour written by hand or by a browser: a longer string is not read. */
    const MAX_LENGTH = 100;

    /** A hex colour: #rgb or #rrggbb, any case. */
    const HEX = /^#(?:[0-9a-f]{3}){1,2}$/i;
    const FUNCTION = /^(rgba?|oklch|oklab|color)\(([^()]*)\)$/i;
    /** color()'s sRGB space, as a browser computes color-mix(in srgb, …). */
    const SRGB = /^srgb\s+/i;
    /** No nested repeats (linear time); the unit is group 1. */
    const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(%|deg)?$/i;

    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
    const radians = (degrees) => (degrees * Math.PI) / 180;

    /** A number token of a colour function: its value and unit ('%', 'deg' or ''); null
        when not a number or not finite (1e400). */
    function number(token) {
        if (token.toLowerCase() === 'none') return { value: 0, unit: '' };
        const match = NUMBER.exec(token);
        const value = parseFloat(token);
        return match && Number.isFinite(value)
            ? { value, unit: (match[1] ?? '').toLowerCase() }
            : null;
    }

    /** '#rrggbb' of a #rgb or #rrggbb colour (#rgb's digits doubled, case kept); null for anything
        else. A value is '#rrggbb' exactly when expandHex(value) === value. */
    const expandHex = (text) =>
        typeof text === 'string' && HEX.test(text)
            ? text.length === 4
                ? text.replace(/[0-9a-f]/gi, '$&$&')
                : text
            : null;

    const hexChannels = (hex) => {
        const digits = expandHex(hex).slice(1);
        return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255);
    };

    /** sRGB channels of an rgb() argument list. */
    function rgbChannels(tokens) {
        if (tokens.slice(0, 3).some((t) => t.unit === 'deg')) return null;
        return tokens
            .slice(0, 3)
            .map(({ value, unit }) => clamp(unit === '%' ? value / 100 : value / 255));
    }

    /** sRGB channels of a color(srgb …) argument list: numbers 0–1 or percentages. */
    function srgbChannels(tokens) {
        if (tokens.slice(0, 3).some((t) => t.unit === 'deg')) return null;
        return tokens
            .slice(0, 3)
            .map(({ value, unit }) => clamp(unit === '%' ? value / 100 : value));
    }

    /** sRGB channels (possibly outside 0–1) of an oklab() argument list, as a browser computes
        color-mix(in oklab, …). */
    function oklabChannels([l, a, b]) {
        if ([l, a, b].some((t) => t.unit === 'deg')) return null;
        const lightness = clamp(l.unit === '%' ? l.value / 100 : l.value);
        const axis = (t) => (t.unit === '%' ? (t.value / 100) * 0.4 : t.value);
        return oklabToRgb([lightness, axis(a), axis(b)]);
    }

    /** sRGB channels (possibly outside 0–1) of an oklch() argument list. */
    function oklchChannels([l, c, h]) {
        if (l.unit === 'deg' || c.unit === 'deg' || h.unit === '%') return null;
        const lightness = clamp(l.unit === '%' ? l.value / 100 : l.value);
        const chroma = Math.max(0, c.unit === '%' ? (c.value / 100) * 0.4 : c.value);
        return oklabToRgb(toLab([lightness, chroma, h.value]));
    }

    /** sRGB channels 0–1 of a #rgb, #rrggbb, rgb()/rgba(), oklch(), oklab() or color(srgb …) colour
        (alpha ignored); an oklch() outside sRGB keeps its channels outside 0–1. Null when
        not parseable. */
    function parse(input) {
        if (typeof input !== 'string' || input.length > MAX_LENGTH) return null;
        const text = input.trim();
        if (HEX.test(text)) return hexChannels(text);
        const match = FUNCTION.exec(text);
        if (!match) return null;
        const kind = match[1].toLowerCase();
        let args = match[2].trim();
        if (kind === 'color') {
            if (!SRGB.test(args)) return null;
            args = args.replace(SRGB, '');
        }
        const tokens = args.split(/\s*[,/]\s*|\s+/).map(number);
        if (tokens.length < 3 || tokens.length > 4 || tokens.includes(null)) return null;
        const rgb =
            { oklch: oklchChannels, oklab: oklabChannels, color: srgbChannels }[kind]?.(tokens) ??
            (kind.startsWith('rgb') ? rgbChannels(tokens) : null);
        return isTriple(rgb) ? rgb : null;
    }

    const toLinear = (c) =>
        Math.sign(c) *
        (Math.abs(c) <= 0.04045 ? Math.abs(c) / 12.92 : ((Math.abs(c) + 0.055) / 1.055) ** 2.4);
    const toGamma = (c) =>
        Math.sign(c) *
        (Math.abs(c) <= 0.0031308 ? Math.abs(c) * 12.92 : 1.055 * Math.abs(c) ** (1 / 2.4) - 0.055);

    function rgbToOklab(rgb) {
        const [r, g, b] = rgb.map(toLinear);
        const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
        const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
        const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
        return [
            0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
        ];
    }

    function oklabToRgb([L, a, b]) {
        const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
        const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
        const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
        return [
            4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
        ].map(toGamma);
    }

    const toLch = ([L, a, b]) => [
        L,
        Math.hypot(a, b),
        ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
    ];
    const toLab = ([L, c, h]) => [L, c * Math.cos(radians(h)), c * Math.sin(radians(h))];
    const inGamut = (rgb) => rgb.every((c) => c >= -GAMUT_EPSILON && c <= 1 + GAMUT_EPSILON);
    /** Exactly three finite numbers. */
    const isTriple = (list) =>
        Array.isArray(list) && list.length === 3 && list.every(Number.isFinite);
    /** sRGB channels of a colour given as channels or a CSS string; null unless three finite numbers. */
    const channels = (color) => {
        const rgb = Array.isArray(color) ? color : parse(color);
        return isTriple(rgb) ? rgb : null;
    };

    /** sRGB channels of an OKLCH colour, inside the gamut: a colour outside it keeps
        its lightness and hue and loses chroma until it fits (binary search on C).
        Null unless [l, c, h] are three finite numbers. */
    function fromOklch(lch) {
        if (!isTriple(lch)) return null;
        const [l, c, h] = lch;
        if (l >= 1) return [1, 1, 1];
        if (l <= 0) return [0, 0, 0];
        const rgb = oklabToRgb(toLab([l, c, h]));
        if (inGamut(rgb)) return rgb.map((channel) => clamp(channel));
        let fits = 0;
        let overflows = c;
        while (overflows - fits > CHROMA_PRECISION) {
            const mid = (fits + overflows) / 2;
            if (inGamut(oklabToRgb(toLab([l, mid, h])))) fits = mid;
            else overflows = mid;
        }
        return oklabToRgb(toLab([l, fits, h])).map((channel) => clamp(channel));
    }

    /** '#rrggbb' of a colour (CSS string or sRGB channels), mapped into sRGB; null when not parseable. */
    function toHex(color) {
        const rgb = channels(color);
        if (!rgb) return null;
        const fitted = inGamut(rgb) ? rgb : fromOklch(toLch(rgbToOklab(rgb)));
        if (!fitted) return null;
        return `#${fitted
            .map((c) =>
                Math.round(clamp(c) * 255)
                    .toString(16)
                    .padStart(2, '0'),
            )
            .join('')}`;
    }

    /** APCA lightness contrast (0.0.98G) of `text` on `bg`, unsigned; null when one is not parseable. */
    function apca(text, bg) {
        const hexT = toHex(text);
        const hexB = toHex(bg);
        if (!hexT || !hexB) return null;
        const y = (hex) => {
            const [r, g, b] = [1, 3, 5].map(
                (i) => (parseInt(hex.slice(i, i + 2), 16) / 255) ** 2.4,
            );
            const lum = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
            return lum < 0.022 ? lum + (0.022 - lum) ** 1.414 : lum;
        };
        const [t, b] = [y(hexT), y(hexB)];
        const s = b > t ? (b ** 0.56 - t ** 0.57) * 1.14 : (b ** 0.65 - t ** 0.62) * 1.14;
        return Math.abs(s) < 0.1 ? 0 : (Math.abs(s) - 0.027) * 100;
    }

    /** White reads about as well as dark on fill `seed` by APCA (within 6 Lc), where WCAG 2 often
        picks dark on mid blues and oranges: the presets' rule for pinning white labels. */
    const readsWhite = (seed) => apca(LIGHT_TEXT, seed) >= apca(DARK_TEXT, seed) - 6;

    /**
     * demo-cards.js — The Demos page cards: picking a colour preset, a corner shape or a scheme
     * updates the thumbnail (or the drawn tile's colour) and the links, which open
     * the demo with that look through the Style Switcher's URL parameters.
     *
     *   [data-demo-card data-page]  radios name="demo-<id>-preset" (data-query, data-color, data-thumb?,
     *                               data-thumb-dark?: the thumbnail in the dark scheme)
     *                               name="demo-<id>-shape" and name="demo-<id>-scheme" (light | dark,
     *                               absent when the demo has no dark mode); [data-demo-link] anchors;
     *                               [data-demo-thumb] img or [data-demo-tile]; a Custom Color radio
     *                               [data-demo-custom] (of the preset group) and its [data-demo-custom-input]
     *
     * main.js fetches this file (and the registry it reads) only on a page with cards.
     * A card whose picks are live carries data-demo-card="ready".
     */

    /** `page` with the preset's query, a picked shape with its buttons and the dark scheme when
        picked. 'default' is the demo as designed (its own corners): it adds nothing. */
    function demoHref(page, query, shape, scheme = 'light') {
        const params = new URLSearchParams(query);
        if (shape && shape !== 'default') {
            params.set('corners', shape);
            params.set('buttons', CORNER_BUTTONS[shape]);
        }
        if (scheme === 'dark') params.set('scheme', 'dark');
        const search = params.toString();
        return search ? `${page}?${search}` : page;
    }

    /** The query of a colour picked on the card (`#rrggbb`): the primary, with white labels on it
        wherever white reads about as well as dark (the presets' rule), else Auto. */
    function customQuery(hex) {
        return new URLSearchParams({
            primary: hex.slice(1).toLowerCase(),
            'on-primary': readsWhite(hex) ? 'light' : 'auto',
        }).toString();
    }

    function initDemoCards(root = document) {
        root.querySelectorAll('[data-demo-card]').forEach((card) => {
            const page = card.dataset.page;
            const update = () => {
                const preset = card.querySelector('input[name$="-preset"]:checked');
                const shape = card.querySelector('input[name$="-shape"]:checked')?.value;
                const scheme = card.querySelector('input[name$="-scheme"]:checked')?.value;
                if (!preset) return;
                const href = demoHref(page, preset.dataset.query, shape, scheme);
                card.querySelectorAll('[data-demo-link]').forEach((a) =>
                    a.setAttribute('href', href),
                );
                const thumb = card.querySelector('[data-demo-thumb]');
                const image =
                    (scheme === 'dark' && preset.dataset.thumbDark) || preset.dataset.thumb;
                // Only a change of picture: setting the same address again would fetch it again
                if (thumb && image && thumb.getAttribute('src') !== image) thumb.src = image;
                card.querySelector('[data-demo-tile]')?.style.setProperty(
                    '--tile',
                    preset.dataset.color,
                );
            };
            card.addEventListener('change', update);
            // Custom Color: the picked colour becomes the demo's primary; clicking the dot again
            // brings back the colour picked before
            const custom = card.querySelector('[data-demo-custom]');
            const picker = card.querySelector('[data-demo-custom-input]');
            if (custom && picker) {
                const pick = () => {
                    custom.dataset.query = customQuery(picker.value);
                    custom.dataset.color = picker.value;
                    custom.parentElement.style.setProperty('--swatch', picker.value);
                    custom.parentElement.classList.add('is-picked');
                    custom.checked = true;
                    update();
                };
                picker.addEventListener('input', pick);
                picker.addEventListener('click', () => {
                    if (custom.parentElement.classList.contains('is-picked')) pick();
                });
            }
            update();
            card.dataset.demoCard = 'ready';
        });
    }

    /** The cards in `order`: 'featured' (data-order), 'newest' (data-created, registry order), 'name' or 'pages'. */
    function sortDemoCards(cards, order) {
        const by =
            {
                featured: (a, b) => a.dataset.order - b.dataset.order,
                newest: (a, b) => b.dataset.created - a.dataset.created,
                name: (a, b) => a.dataset.name.localeCompare(b.dataset.name),
                pages: (a, b) =>
                    b.dataset.pages - a.dataset.pages || a.dataset.order - b.dataset.order,
            }[order] ?? (() => 0);
        return [...cards].sort(by);
    }

    /**
     * The Demos toolbar: category tabs, a search field and a sort select narrow and
     * order the grid; the status line counts what is left, an empty note offers a reset.
     *
     *   [data-demo-browser]  .demo-tab[data-filter] buttons (aria-pressed), [data-demo-search],
     *                        [data-demo-sort], [data-demo-grid] of [data-demo-card]
     *                        (data-category: space-separated ids, data-search), [data-demo-shown], [data-demo-empty],
     *                        [data-demo-reset]; the tabs past the largest sit in [data-demo-more]:
     *                        a [data-demo-more-toggle] (its [data-demo-more-label] names the picked one)
     *                        opening .demo-more-menu
     *
     * With [data-demo-limit="32"] (the Home) All shows the first 32 cards (a quarter of that on
     * phones), rounded down to full rows of the grid; while more remain the browser carries .is-capped (the last row fades) and the
     * [data-demo-expand] button (aria-expanded, aria-controls the grid), its [data-demo-expand-count]
     * saying how many, unfolds the rest below the shown ones (the reveal element's motion: the list's
     * max-height opens under .is-revealing, the new cards .expand-in) and moves a keyboard user's focus
     * to the first of them. Another tab or a search shows every match; back on All the list is as the
     * visitor left it, folded or unfolded.
     *
     * `?category=<id>` in the address opens on that tab (the header menus link to it), and
     * picking a tab writes it back (not on a limited list). A tab with no demo yet swaps the empty note's
     * [data-demo-empty-match] lines for its [data-demo-empty-soon] ones, named in [data-demo-empty-name].
     */
    function initDemoBrowser(root = document) {
        root.querySelectorAll('[data-demo-browser]').forEach((browser) => {
            const grid = browser.querySelector('[data-demo-grid]');
            const tabs = browser.querySelectorAll('.demo-tab[data-filter]');
            const search = browser.querySelector('[data-demo-search]');
            const sort = browser.querySelector('[data-demo-sort]');
            const cards = [...grid.querySelectorAll('[data-demo-card]')];
            const empty = browser.querySelector('[data-demo-empty]');
            const expand = browser.querySelector('[data-demo-expand]');
            const limit = Number(browser.dataset.demoLimit) || Infinity;
            const phone = window.matchMedia('(max-width: 639px)');
            const still = window.matchMedia('(prefers-reduced-motion: reduce)');
            const columns = () => getComputedStyle(grid).gridTemplateColumns.split(' ').length;
            let filter = 'all';
            let expanded = false;
            const tabName = (tab) => tab.firstChild.textContent.trim();
            const inCategory = (card) =>
                filter === 'all' || card.dataset.category.split(' ').includes(filter);

            const apply = (animate = true) => {
                const words = (search?.value ?? '')
                    .trim()
                    .toLowerCase()
                    .split(/\s+/)
                    .filter(Boolean);
                const first = phone.matches ? Math.ceil(limit / 4) : limit;
                const cap =
                    expanded || filter !== 'all' || words.length
                        ? Infinity
                        : Math.max(columns(), first - (first % columns()));
                let shown = 0;
                let matched = 0;
                sortDemoCards(cards, sort?.value ?? 'featured').forEach((card) => {
                    const match =
                        inCategory(card) &&
                        words.every((word) => card.dataset.search.includes(word));
                    if (match) matched++;
                    const show = match && shown < cap;
                    card.classList.toggle('is-hidden', !show);
                    if (show) card.style.setProperty('--stagger', shown++);
                    grid.append(card);
                });
                browser.querySelector('[data-demo-shown]').textContent = matched;
                browser.classList.toggle('is-capped', matched > shown);
                if (expand) {
                    expand.hidden = matched <= shown;
                    expand.setAttribute('aria-expanded', String(expanded));
                    expand.querySelector('[data-demo-expand-count]').textContent = matched - shown;
                }
                empty.hidden = matched > 0;
                // A category with no demo yet says they are coming rather than "no match"
                const soon = !cards.some(inCategory);
                empty.querySelectorAll('[data-demo-empty-match]').forEach((el) => {
                    el.hidden = soon;
                });
                empty.querySelectorAll('[data-demo-empty-soon]').forEach((el) => {
                    el.hidden = !soon;
                });
                const named = empty.querySelector('[data-demo-empty-name]');
                if (soon && named)
                    named.textContent = tabName([...tabs].find((t) => t.dataset.filter === filter));
                // Replay the gallery fade on what is left (not on the first pass of a limited list)
                if (animate === false) return;
                grid.classList.remove('gallery-grid--animating');
                void grid.offsetWidth;
                grid.classList.add('gallery-grid--animating');
            };

            const more = browser.querySelector('[data-demo-more]');
            const toggle = more?.querySelector('[data-demo-more-toggle]');
            const menu = more?.querySelector('.demo-more-menu');
            const open = (state) => {
                if (!more) return;
                menu.hidden = !state;
                toggle.setAttribute('aria-expanded', String(state));
            };

            const select = (tab) => {
                filter = tab.dataset.filter;
                tabs.forEach((t) => t.setAttribute('aria-pressed', String(t === tab)));
                if (more) {
                    const inMenu = menu.contains(tab);
                    toggle.classList.toggle('is-active', inMenu);
                    more.querySelector('[data-demo-more-label]').textContent = inMenu
                        ? tabName(tab)
                        : 'More';
                    open(false);
                }
                apply();
            };

            // The top of the list: the toolbar at its pinned place (from 768px, the header
            // scrolled away), else under the header. `onlyUp` leaves a reader above the list alone.
            const toList = ({ immediate = false, onlyUp = false } = {}) => {
                const bar = browser.querySelector('.demo-toolbar');
                const style = bar && getComputedStyle(bar);
                const header = document.querySelector('[data-header]');
                // a pixel past its pinned place, so sticky.js counts it as pinned
                const gap =
                    style?.position === 'sticky'
                        ? (parseFloat(style.top) || 0) - 1
                        : (header?.offsetHeight ?? 0) + 24;
                // the bar opens the block, so the block's top is where the bar sits unpinned
                const y = window.scrollY + browser.getBoundingClientRect().top - gap;
                if (onlyUp && y >= window.scrollY - 1) return;
                if (window.__lenis) window.__lenis.scrollTo(y, { immediate });
                else window.scrollTo({ top: y, behavior: immediate ? 'instant' : 'smooth' });
            };

            tabs.forEach((tab) =>
                tab.addEventListener('click', () => {
                    select(tab);
                    toList({ onlyUp: true });
                    if (expand) return;
                    const url = new URL(location.href);
                    if (filter === 'all') url.searchParams.delete('category');
                    else url.searchParams.set('category', filter);
                    history.replaceState(history.state, '', url);
                }),
            );
            // Arriving on a category (a menu's promo card): open on its results
            const asked = new URLSearchParams(location.search).get('category');
            const start = [...tabs].find((tab) => tab.dataset.filter === asked);
            if (start) {
                select(start);
                toList({ immediate: true });
            } else if (limit !== Infinity) apply(false);
            if (more) {
                toggle.addEventListener('click', () => open(menu.hidden));
                document.addEventListener('click', (event) => {
                    if (!more.contains(event.target)) open(false);
                });
                more.addEventListener('keydown', (event) => {
                    if (event.key !== 'Escape' || menu.hidden) return;
                    open(false);
                    toggle.focus();
                });
            }
            search.addEventListener('input', () => {
                apply();
                toList({ onlyUp: true });
            });
            sort.addEventListener('change', () => {
                apply();
                toList({ onlyUp: true });
            });
            if (expand) {
                // a new column count: the limited list ends on a full row again
                for (const query of [
                    phone,
                    ...[640, 1024, 1440].map((w) => window.matchMedia(`(min-width: ${w}px)`)),
                ]) {
                    query.addEventListener('change', () => {
                        if (!expanded) apply(false);
                    });
                }
                // View More: the shown cards stay as they are, the rest unfolds below them
                let unfolding = [];
                const root = document.documentElement;
                const anchorAgain = () =>
                    requestAnimationFrame(() =>
                        requestAnimationFrame(() => {
                            root.style.overflowAnchor = '';
                        }),
                    );
                const settle = () => {
                    if (!browser.classList.contains('is-revealing')) return;
                    browser.classList.remove('is-revealing');
                    grid.style.maxHeight = '';
                    anchorAgain();
                    unfolding.forEach((card) => {
                        card.classList.remove('expand-in');
                        card.style.animationDelay = '';
                    });
                    unfolding = [];
                };
                // the next two rows' pictures load as the button nears the screen, so they open filled
                const warm = new IntersectionObserver(
                    ([entry]) => {
                        if (!entry.isIntersecting) return;
                        warm.disconnect();
                        const next = [
                            ...grid.querySelectorAll(
                                '[data-demo-card].is-hidden [data-demo-thumb]',
                            ),
                        ].slice(0, 8);
                        next.forEach((img) => {
                            img.loading = 'eager';
                            img.decode().catch(() => {});
                        });
                    },
                    { rootMargin: '600px 0px' },
                );
                warm.observe(expand);
                grid.addEventListener('transitionend', (event) => {
                    if (event.target === grid && event.propertyName === 'max-height') settle();
                });
                expand.addEventListener('click', () => {
                    const shown = new Set(
                        grid.querySelectorAll('[data-demo-card]:not(.is-hidden)'),
                    );
                    const from = grid.offsetHeight;
                    expanded = true;
                    // the list only grows downwards: no scroll anchoring on a node below it
                    root.style.overflowAnchor = 'none';
                    // no replay of the tabs' cascade on the cards already shown
                    grid.classList.remove('gallery-grid--animating');
                    if (!still.matches) {
                        grid.style.maxHeight = `${from}px`;
                        browser.classList.add('is-revealing');
                    }
                    apply(false);
                    unfolding = [
                        ...grid.querySelectorAll('[data-demo-card]:not(.is-hidden)'),
                    ].filter((card) => !shown.has(card));
                    if (!still.matches) {
                        const across = columns();
                        unfolding.forEach((card, i) => {
                            card.style.animationDelay = `${Math.min(Math.floor(i / across), 3) * 90}ms`;
                            card.classList.add('expand-in');
                        });
                        void grid.offsetHeight;
                        // a screen's worth opens in view; the rest is below the fold
                        grid.style.maxHeight = `${Math.min(grid.scrollHeight, from + window.innerHeight)}px`;
                        setTimeout(settle, 1200);
                    } else anchorAgain();
                    if (root.dataset.focusSource !== 'pointer') {
                        unfolding[0]
                            ?.querySelector('.demo-card-title a')
                            ?.focus({ preventScroll: true });
                    }
                });
            }
            browser.querySelector('[data-demo-reset]').addEventListener('click', () => {
                search.value = '';
                tabs[0].click();
            });
        });
    }

    /**
     * home.js — The Home's live Style Switcher (the hero deck, built by scripts/demos/cards.mjs).
     *
     *   [data-home-showcase]  .home-deck-card labels (--slot: place on the arc, 0 in the middle;
     *                         --abs: its distance), each a radio name="showcase-demo" (value: the
     *                         demo id, data-page, data-name) over its .home-deck-screen picture;
     *                         per demo a [data-showcase-presets="<id>"] group of radios (data-name,
     *                         data-query, data-color, data-thumb, data-thumb-dark?);
     *                         name="showcase-scheme" (light | dark); name="showcase-corners"
     *                         (square … round); [data-showcase-link] (Open This Look),
     *                         [data-showcase-name], [data-showcase-preset], [data-showcase-play]
     *
     * Picking a demo turns the deck until its card is in the middle; a preset or the mode wipes the
     * middle picture to the demo's real screenshot in that look; Corners reshape the deck and the
     * panel (--radius-scale, the buttons' shape). The link opens the demo in the look shown.
     * While nobody touches it, a tour runs: the deck turns to the next demo, step after step, as a
     * click on it would. It waits while the pointer is over the deck or its panel, the deck focused or
     * off screen and in a background tab, never runs for reduced motion, and ends once a visitor picks
     * something (Play resumes it).
     * [data-home-drift] (the hero stage) gets .is-paused while it is off screen, which rests its
     * drifting light. main.js fetches this file on a page with a showcase or a drifting stage.
     */

    /** Corner stop → the stage's --radius-scale and its buttons' radius (null: as designed) */
    const CORNERS = {
        square: [0, '0px'],
        subtle: [0.5, '0.5rem'],
        default: [1, null],
        round: [1.5, '9999px'],
    };

    const STEP = 3000;
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

    /** Shows `src` in `screen`: the new picture wipes in over the last one. */
    function wipe(screen, src, alt) {
        const shown = screen.querySelector('img:last-child');
        if (shown?.getAttribute('src') === src) return;
        const next = new Image(720, 920);
        next.src = src;
        next.alt = alt;
        next.decoding = 'async';
        const enter = () => {
            // Only the picture under the incoming one stays; a quick run of picks drops the rest
            [...screen.querySelectorAll('img')].slice(0, -1).forEach((img) => img.remove());
            screen.append(next);
            const settle = () =>
                screen.querySelectorAll('img').forEach((img) => {
                    if (img !== next && next.isConnected) img.remove();
                });
            if (reduced()) settle();
            else next.addEventListener('animationend', settle, { once: true });
        };
        next.decode().then(enter, enter);
    }

    function initHomeShowcase(root = document) {
        // The hero's drifting light rests while the stage is off screen ([data-home-drift].is-paused)
        root.querySelectorAll('[data-home-drift]').forEach((field) => {
            new IntersectionObserver(([entry]) =>
                field.classList.toggle('is-paused', !entry.isIntersecting),
            ).observe(field);
        });

        root.querySelectorAll('[data-home-showcase]').forEach((stage) => {
            const link = stage.querySelector('[data-showcase-link]');
            const label = stage.querySelector('[data-showcase-preset]');
            const name = stage.querySelector('[data-showcase-name]');
            const play = stage.querySelector('[data-showcase-play]');
            const demos = [...stage.querySelectorAll('input[name="showcase-demo"]')];
            const picked = (field) => stage.querySelector(`input[name="${field}"]:checked`);
            const group = (demo) => stage.querySelector(`[data-showcase-presets="${demo.value}"]`);
            const preset = () => group(picked('showcase-demo')).querySelector('input:checked');
            const scheme = () => picked('showcase-scheme')?.value ?? 'light';
            const corners = () => picked('showcase-corners')?.value ?? 'default';

            const show = () => {
                const demo = picked('showcase-demo');
                const look = preset();
                const at = demos.indexOf(demo);
                const half = Math.floor(demos.length / 2);
                // The deck turns: every card takes its place relative to the picked one
                demos.forEach((radio, i) => {
                    const slot = ((i - at + demos.length + half) % demos.length) - half;
                    const card = radio.closest('.home-deck-card');
                    card.style.setProperty('--slot', slot);
                    card.style.setProperty('--abs', Math.abs(slot));
                    card.classList.toggle('is-live', slot === 0);
                });
                stage.querySelectorAll('[data-showcase-presets]').forEach((g) => {
                    g.hidden = g !== group(demo);
                });
                name.textContent = demo.dataset.name;
                label.textContent = look.dataset.name;
                stage.style.setProperty('--stage-tint', look.dataset.color);
                const dark = scheme() === 'dark' && Boolean(look.dataset.thumbDark);
                stage.dataset.scheme = dark ? 'dark' : 'light';
                const [scale, buttons] = CORNERS[corners()];
                stage.style.setProperty('--radius-scale', scale);
                if (buttons) stage.style.setProperty('--btn-radius-override', buttons);
                else stage.style.removeProperty('--btn-radius-override');
                link.href = demoHref(
                    demo.dataset.page,
                    look.dataset.query,
                    corners(),
                    stage.dataset.scheme,
                );
                wipe(
                    demo.closest('.home-deck-card').querySelector('.home-deck-screen'),
                    dark ? look.dataset.thumbDark : look.dataset.thumb,
                    `${demo.dataset.name} demo, ${look.dataset.name} preset, ${stage.dataset.scheme} mode`,
                );
            };

            // The tour: the next demo turns to the middle, as a click on its card would
            let timer = 0;
            let touring = false;
            let hold = false;
            let visible = false;
            const step = () => {
                demos[(demos.indexOf(picked('showcase-demo')) + 1) % demos.length].checked = true;
                show();
            };
            // While a step counts down the panel draws its progress (.is-counting, --tour-step)
            stage.style.setProperty('--tour-step', `${STEP}ms`);
            const schedule = () => {
                clearTimeout(timer);
                stage.classList.remove('is-counting');
                if (!touring || hold || !visible || document.hidden) return;
                void stage.offsetWidth;
                stage.classList.add('is-counting');
                timer = setTimeout(() => {
                    step();
                    schedule();
                }, STEP);
            };
            const setTouring = (state) => {
                touring = state;
                stage.classList.toggle('is-touring', state);
                if (play) {
                    play.querySelector('.sr-only').textContent = state
                        ? 'Pause the Preview'
                        : 'Play the Preview';
                    play.querySelector('.ph-fill').className =
                        `ph-fill ${state ? 'ph-pause' : 'ph-play'}`;
                }
                schedule();
            };

            stage.addEventListener('change', (event) => {
                show();
                if (event.isTrusted) setTouring(false);
            });

            show();
            if (reduced()) return;
            if (play) {
                play.hidden = false;
                play.addEventListener('click', () => setTouring(!touring));
            }
            const pause = (state) => () => {
                hold = state;
                schedule();
            };
            stage.addEventListener('pointerenter', pause(true));
            stage.addEventListener('pointerleave', pause(false));
            // Focus on a control holds the tour; on Play itself it does not
            stage.addEventListener('focusin', (event) => pause(event.target !== play)());
            stage.addEventListener('focusout', (event) => {
                if (!stage.contains(event.relatedTarget)) pause(false)();
            });
            document.addEventListener('visibilitychange', schedule);
            new IntersectionObserver(
                ([entry]) => {
                    visible = entry.isIntersecting;
                    schedule();
                },
                { threshold: 0.25 },
            ).observe(stage);
            setTouring(true);
        });
    }

    /**
     * showcase.js — The template showing itself: the Demos page cards, the Home's
     * live Style Switcher and the icon browser (features-icons.html).
     *
     * A site built from Framo does not need this file. main.js loads it only on
     * pages whose markup has these blocks (parts.js); in the Ready package it is
     * assets/js/showcase.js, linked on those pages before main.js.
     */

    /** The icon browser's Alpine component: added before Alpine starts. */
    function registerShowcase(Alpine) {
        Alpine.data('iconLibrary', iconLibrary);
    }

    /** Started once the page is parsed; each one returns at once without its markup. */
    function initShowcase() {
        initDemoCards(); // [data-demo-card]: preset, corners and scheme pickers
        initDemoBrowser(); // [data-demo-browser]: category filter and sort
        initHomeShowcase(); // [data-home-showcase]: the Home's hero deck
    }

    // Icon library browser — searchable, click-to-copy icon grid (features-icons.html).
    // Config (libraries + active id) is passed inline from the page so adding a future
    // icon library is a data change, not a code change.
    const iconLibrary = (config = {}) => ({
        libraries: config.libraries || [],
        active:
            config.active ||
            (config.libraries && config.libraries[0] && config.libraries[0].id) ||
            '',
        query: '',
        icons: [],
        prefix: '',
        loading: true,
        copied: null,
        _cache: {},
        _timer: null,

        init() {
            this.load(this.active);
        },

        async load(id) {
            const lib = this.libraries.find((l) => l.id === id);
            if (!lib) return;
            this.active = id;
            this.query = '';
            this.copied = null;
            this.prefix = lib.prefix;
            if (this._cache[id]) {
                this.icons = this._cache[id];
                this.loading = false;
                return;
            }
            this.loading = true;
            try {
                // A <script>, not fetch(): fetch is blocked when a page opens from file://.
                if (!window.FramoIconData?.[id]) {
                    await new Promise((done, fail) => {
                        const script = document.createElement('script');
                        script.src = lib.src;
                        script.onload = done;
                        script.onerror = fail;
                        document.head.append(script);
                    });
                }
                this._cache[id] = window.FramoIconData?.[id]?.icons || [];
                this.icons = this._cache[id];
            } catch {
                this.icons = [];
            } finally {
                this.loading = false;
            }
        },

        get filtered() {
            const q = this.query.trim().toLowerCase();
            return q ? this.icons.filter((n) => n.includes(q)) : this.icons;
        },

        markup(name) {
            return `<i class="${this.prefix} ${this.prefix}-${name}"></i>`;
        },

        async copy(name) {
            try {
                await navigator.clipboard.writeText(this.markup(name));
            } catch {
                return;
            }
            this.copied = name;
            clearTimeout(this._timer);
            this._timer = setTimeout(() => {
                this.copied = null;
            }, 1200);
        },

        destroy() {
            clearTimeout(this._timer);
        },
    });

    exports.initShowcase = initShowcase;
    exports.registerShowcase = registerShowcase;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
})((this.FramoVendor = this.FramoVendor || {}));
(FramoVendor.ready ??= []).push('showcase');
