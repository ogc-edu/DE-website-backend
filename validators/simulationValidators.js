const { z } = require("zod");

const intArray = (min, max, label) =>
  z
    .array(z.number().int().min(min).max(max))
    .min(1, `${label} must have at least one value`);

const createSimulationSchema = z.object({
  functions: intArray(1, 10, "Benchmark functions"),
  methods: z.object({
    mutation: intArray(1, 10, "Mutation"),
    crossover: intArray(1, 4, "Crossover"),
    selection: intArray(1, 2, "Selection"),
  }),
});

module.exports = {
  createSimulationSchema,
};
