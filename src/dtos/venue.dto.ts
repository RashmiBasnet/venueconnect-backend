import z from "zod";
import { VenueSchema } from "../types/venue.type";

export const CreateVenueDto = VenueSchema;
export type CreateVenueDto = z.infer<typeof CreateVenueDto>;

export const UpdateVenueDto = VenueSchema.partial();
export type UpdateVenueDto = z.infer<typeof UpdateVenueDto>;
