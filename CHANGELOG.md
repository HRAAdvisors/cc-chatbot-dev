# Final change notes

## Resource finder interface

- Use the title “Clark County Digital Equity Assistant” with a blue header and a “How to use this tool” guide.
- Place the three resource-category icons and labels above the address search field. Omit the separate “Clark County, Nevada” label.
- Prompt users with “Enter a client address to find nearby resources.” and display the “@ to search address” hint inside the field.
- Keep counts for all three result categories visible, including zero-result categories placed last with links to their empty sections.
- Label the selected-resource panel “Resources to share,” with explicit actions: “Download resource list (PDF),” “Share resource list,” and “Share case note.”
- Include every selected resource in case notes without a separate referral dropdown. Keep address inclusion optional and service outcomes explicitly unconfirmed.
- Use raised search and resource surfaces, category count tiles, and a distinct sharing panel while retaining concise copy.
- Inset dropdown arrows from the right edge throughout the application and retain native arrows in forced-colors mode.
- Update the walkthrough and Spanish translations to match the interface.

## Validation

- Resource-finder and case-note regression tests passed, including multiple selected resources and zero-result categories.
- TypeScript and targeted ESLint checks passed.
- Browser checks covered the header, search layout, resource counts, sharing and case-note flows, dropdown interaction, and desktop/mobile layouts.
