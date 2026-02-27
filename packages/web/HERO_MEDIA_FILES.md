# Hero Section Media Files

The HeroSection component requires the following media files to be placed in the `static/` folder:

## Required Files

Copy these files from `/Users/tx1138/atob/public/` to `/Users/tx1138/atob-nostrdevs/atob/packages/web/static/`:

1. **hero-alt.mp4** - Main intro video that plays once on first visit
2. **hero.jpeg** - Background image 1 (rotates after video ends)
3. **hero-3.jpeg** - Background image 2
4. **hero-4.jpeg** - Background image 3
5. **hero-5.jpeg** - Background image 4

## Copy Command

```bash
cd /Users/tx1138/atob-nostrdevs/atob/packages/web/static
cp /Users/tx1138/atob/public/hero-alt.mp4 .
cp /Users/tx1138/atob/public/hero.jpeg .
cp /Users/tx1138/atob/public/hero-3.jpeg .
cp /Users/tx1138/atob/public/hero-4.jpeg .
cp /Users/tx1138/atob/public/hero-5.jpeg .
```

## Fallback

If the media files are not present, the component will still work but will show:

- No video background (will skip directly to the intro sequence)
- Missing image placeholders (browser will show broken image icons)

The intro animation and all UI elements will still function correctly.
