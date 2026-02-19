import z from "zod";

export const PackageSchema = z.object({
    venueId: z.string().trim(),

    name: z.string().trim().min(3, "Package name must be at least 3 characters"),
    description: z.string().optional(),

    // optional images for a package (e.g. menu images)
    images: z.array(z.string()).optional(),

    pricing: z.object({
        priceType: z.enum(["PER_PLATE", "FLAT"]),
        price: z.coerce.number().min(0),
        currency: z.enum(["NPR", "USD", "INR"]).default("NPR"),
    }),

    capacity: z
        .object({
            minGuests: z.coerce.number().min(1).default(1),
            maxGuests: z.coerce.number().min(1),
        })
        .optional(),

    // what’s included in the package (decor, sound, catering, etc.)
    inclusions: z
        .union([z.array(z.string()), z.string()])
        .optional()
        .transform((val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val.map((x) => x.trim()).filter(Boolean);
            return val.split(",").map((x) => x.trim()).filter(Boolean);
        }),

    isActive: z
        .union([z.boolean(), z.string()])
        .default(true)
        .transform((v) => (typeof v === "string" ? v === "true" : v)),
});

export type PackageType = z.infer<typeof PackageSchema>;
