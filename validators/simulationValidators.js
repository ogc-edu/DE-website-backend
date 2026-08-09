const { z } = require("zod");

const intArray = (min, max, label) =>
  z
    .array(z.number().int().min(min).max(max))
    .min(1, `${label} must have at least one value`);

// DE algorithm parameters — optional in the request body (defaults applied
// here AND in the model so direct model calls stay consistent). Ranges mirror
// de.cpp validation in DE-forEC2 (dim 1–30, np 10–40).
const deParam = (min, max, label) =>
  z.coerce
    .number()
    .min(min, `${label} must be between ${min} and ${max}`)
    .max(max, `${label} must be between ${min} and ${max}`);

const createSimulationSchema = z.object({
  functions: intArray(1, 10, "Benchmark functions"),
  methods: z.object({
    mutation: intArray(1, 10, "Mutation"),
    crossover: intArray(1, 4, "Crossover"),
    selection: intArray(1, 2, "Selection"),
  }),
  np: deParam(10, 40, "Population size (np)").default(15),
  f: deParam(0.1, 2.0, "Scaling factor (f)").default(0.5),
  cr: deParam(0.01, 1.0, "Crossover rate (cr)").default(0.9),
  gen: z.coerce
    .number()
    .int()
    .min(1, "Generations (gen) must be at least 1")
    .default(1000),
  dim: deParam(1, 30, "Dimension (dim)").default(30),
});

module.exports = {
  createSimulationSchema,
};
