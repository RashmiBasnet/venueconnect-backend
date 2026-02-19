import z from "zod";

export const VenueSchema = z.object({
    name: z.string().trim().min(3, "Venue name must be at least 3 characters"),
    description: z.string().optional(),

    address: z.object({
        area: z.string().optional(),
        city: z.string().default("Kathmandu"),
        country: z.string().default("Nepal"),
        zipCode: z.string().optional(),
    }),

    images: z.array(z.string()).optional(),

    pricing: z.object({
        baseType: z.enum(["PER_PLATE", "FLAT", "PER_HOUR"]),
        basePrice: z.coerce.number().min(0),
        currency: z.enum(["NPR", "USD", "INR"]).default("NPR"),
    }),

    capacity: z.object({
        minGuests: z.coerce.number().min(1).default(1),
        maxGuests: z.coerce.number().min(1),
    }),

    amenities: z
        .union([z.array(z.string()), z.string()])
        .optional()
        .transform((val) => {
            // allow "Parking, AC" OR ["Parking","AC"]
            if (!val) return [];
            if (Array.isArray(val)) return val.map((x) => x.trim()).filter(Boolean);
            return val.split(",").map((x) => x.trim()).filter(Boolean);
        }),

    isActive: z
        .union([z.boolean(), z.string()])
        .default(true)
        .transform((v) => (typeof v === "string" ? v === "true" : v)),
});

export type VenueType = z.infer<typeof VenueSchema>;
