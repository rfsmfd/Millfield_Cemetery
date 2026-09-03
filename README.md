# Millfield Cemetery — map

A phone-friendly map of Millfield Baptist Church cemetery, built from the cemetery
geodatabase. Read-only: nothing in the app can alter the records.

**Not yet published.** See "Before this goes public" below.

---

## What it shows

| | |
|---|---|
| **565 plots** | shaded green *available* · amber *reserved* · grey *occupied* |
| **113 burials** | name, birth, death, age, veteran status |
| **107 Find a Grave links** | tap through to the memorial — photographs, obituary, family |
| **56 family lots** | with owner and lot size |
| **21 section letters** | A–U, shown once zoomed in |

Plus surname search, a filter for available plots, a veterans filter (9 recorded),
and your own position on the map so you can stand in the cemetery and see what is
around you.

---

## Plot status — how it is worked out

Following the rule as stated by the cemetery keeper:

- A plot inside a **LOTS** polygon is **sold** (all 56 lots are sold)
  - contains a burial → **occupied** (107)
  - empty → **reserved** (131)
- A plot in no lot → **available** (327)

Availability is to **church members**. Under the cemetery regulations, plots cannot
be sold to non-members without Committee and Trustee approval, and every burial
requires Committee approval. The map shows what exists; it is not a booking system.

---

## The data

`data/*.geojson`, exported from
`C:\GIS_Projects\MILLFIELD_CEMETERY_RECOVERED\MILLFIELD CEMETERY.gdb`
by `_tools/export_cemetery.py`.

### The coordinate-system trap — read this before re-exporting

The geodatabase holds layers in **two different coordinate systems**:

- `PLOTS1` — GCS_WGS_1972
- everything else — NAD_1927_Polyconic (local grid, coordinates around 14,000)

They only line up under **one** datum transformation:

```
NAD_1927_To_WGS_1984_85      <- correct
WGS_1972_To_WGS_1984_1       <- for PLOTS1
```

Every other transformation silently misplaces the layers relative to each other and
produces wrong answers. It is not obvious, because each one *looks* plausible.

**The test that proves it:** there are 571 `LOTNUMBER` points and 565 plots, so nearly
every point should fall inside a plot.

| Transformation | Points inside a plot |
|---|---|
| **NAD_1927_To_WGS_1984_85** | **568 of 571** |
| NAD_1927_To_WGS_1984_4 | 175 |
| NAD_1927_To_WGS_1984_3 | 162 |
| NAD_1927_To_WGS_1984_5 | 153 |
| NAD_1927_To_WGS_1984_79_CONUS | 130 |
| *(no transformation)* | 298 |

After exporting, always confirm: **111 of 113 burials fall inside a family lot.**
If that number drops, the transformation is wrong.

*(The 2 that fall outside are Louetta and James Leverson Ellis — genuinely
unresolved ground, not an error.)*

---

## Before this goes public

Publishing means every name, birth date and death date is visible to anyone with the
link. Cemetery records are ordinarily public, and Find a Grave already carries 107 of
these people — but that is **the Cemetery Committee's decision to make, not a
technical one.**

Three questions for the Committee:

1. Should names and dates be public?
2. Should the map show which plots are available?
3. Who besides the present keeper holds a copy of the records?

---

## Running it locally

```bash
npx http-server . -p 5185 -c-1
```

Then open `http://localhost:5185`. It needs an internet connection for the satellite
imagery; everything else is local.

---

## Re-exporting after changes in ArcGIS

1. Make the edits in ArcGIS Pro and **save the edits** (Edit tab → Manage Edits →
   Save — this is separate from Ctrl+S, which only saves the project)
2. Close ArcGIS Pro so the geodatabase locks are released
3. Run `_tools/export_cemetery.py`
4. Check the console reports the expected split: **107 occupied, 131 reserved, 327 available**
