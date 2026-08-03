import { z } from "zod";

/** ADSB.lol V2Response_AcItem — fields may be omitted; alt_baro can be "ground". */
export const AdsbLolAircraftSchema = z
  .object({
    hex: z.string(),
    type: z.string().optional(),
    flight: z.string().nullable().optional(),
    r: z.string().nullable().optional(),
    t: z.string().nullable().optional(),
    alt_baro: z.union([z.number(), z.string()]).nullable().optional(),
    alt_geom: z.number().nullable().optional(),
    gs: z.number().nullable().optional(),
    track: z.number().nullable().optional(),
    baro_rate: z.number().nullable().optional(),
    geom_rate: z.number().nullable().optional(),
    lat: z.number().nullable().optional(),
    lon: z.number().nullable().optional(),
    squawk: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    seen: z.number().nullable().optional(),
    seen_pos: z.number().nullable().optional(),
    true_heading: z.number().nullable().optional(),
    messages: z.number().optional(),
    rssi: z.number().optional(),
    mlat: z.array(z.string()).optional(),
    tisb: z.array(z.string()).optional(),
  })
  .passthrough();

export const AdsbLolResponseSchema = z.object({
  ac: z.array(AdsbLolAircraftSchema).default([]),
  ctime: z.number().optional(),
  msg: z.string().optional(),
  now: z.number().optional(),
  ptime: z.number().optional(),
  total: z.number().optional(),
});

export type AdsbLolAircraft = z.infer<typeof AdsbLolAircraftSchema>;
export type AdsbLolResponse = z.infer<typeof AdsbLolResponseSchema>;
