const { parseImportFile } = require("../utils/importParser");

const header = "model\tbenchmark\tlowestFitness";

const validContent = [
  "# np=20",
  "# f=0.7",
  "# cr=0.8",
  "# gen=500",
  "# dim=10",
  header,
  "DE/best/1/binomial/greedy\t1\t2.997146999302399",
  "DE/best/2/binomial/greedy\t1\t0.0016972511838516554",
  "DE/rand/3/exponential/sts\t6\t1.0924594562311541e-14",
].join("\n");

describe("parseImportFile", () => {
  it("parses a valid file into simulationData and params", () => {
    const result = parseImportFile(validContent);
    expect(result.ok).toBe(true);

    expect(result.data.params).toEqual({ np: 20, f: 0.7, cr: 0.8, gen: 500, dim: 10 });

    expect(result.data.simulationData).toEqual([
      { functionId: 1, mutationId: 4, crossoverId: 2, selectionId: 2, lowestFitness: 2.997146999302399 },
      { functionId: 1, mutationId: 5, crossoverId: 2, selectionId: 2, lowestFitness: 0.0016972511838516554 },
      { functionId: 6, mutationId: 3, crossoverId: 1, selectionId: 1, lowestFitness: 1.0924594562311541e-14 },
    ]);
  });

  it("parses mutation names that contain slashes (right-to-left)", () => {
    const result = parseImportFile(`${header}\nDE/current-to-best/1/onepoint/greedy\t9\t1.44855E+00`);
    expect(result.ok).toBe(true);
    expect(result.data.simulationData[0]).toEqual({
      functionId: 9,
      mutationId: 7,
      crossoverId: 3,
      selectionId: 2,
      lowestFitness: 1.44855,
    });
  });

  it("accepts CRLF line endings and case-insensitive header", () => {
    const content = "# np=15\r\nModel\tBenchmark\tLowestFitness\r\nDE/best/1/binomial/greedy\t1\t0.5\r\n";
    const result = parseImportFile(content);
    expect(result.ok).toBe(true);
    expect(result.data.simulationData).toHaveLength(1);
    expect(result.data.params.np).toBe(15);
  });

  it("accepts scientific notation and integers for fitness", () => {
    const result = parseImportFile(
      `${header}\nDE/best/1/binomial/greedy\t1\t2.99E-30\nDE/best/2/binomial/greedy\t1\t0`
    );
    expect(result.ok).toBe(true);
    expect(result.data.simulationData[0].lowestFitness).toBe(2.99e-30);
    expect(result.data.simulationData[1].lowestFitness).toBe(0);
  });

  it("ignores free comments, unknown metadata keys, and comments after the header", () => {
    const content = [
      "# my dataset",
      "# name=ignored for now",
      header,
      "DE/best/1/binomial/greedy\t1\t0.5",
      "# trailing comment",
    ].join("\n");
    const result = parseImportFile(content);
    expect(result.ok).toBe(true);
    expect(result.data.simulationData).toHaveLength(1);
    expect(result.data.params).toEqual({});
  });

  it("returns an error for an empty file", () => {
    const result = parseImportFile("");
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/Missing header/);
  });

  it("returns an error when the first non-comment line is not the header", () => {
    const result = parseImportFile("DE/best/1/binomial/greedy\t1\t0.5");
    expect(result.ok).toBe(false);
    expect(result.errors[0].line).toBe(1);
    expect(result.errors[0].message).toMatch(/Missing header/);
  });

  it("returns an error for a malformed header", () => {
    const result = parseImportFile("model\tbenchmark\textra\nDE/best/1/binomial/greedy\t1\t0.5");
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/Missing header/);
  });

  it("returns an error for a row with the wrong column count", () => {
    const result = parseImportFile(`${header}\nDE/best/1/binomial/greedy\t1`);
    expect(result.ok).toBe(false);
    expect(result.errors[0].line).toBe(2);
    expect(result.errors[0].message).toMatch(/Expected 3 tab-separated columns, got 2/);
  });

  it("rejects an unknown selection with a helpful message", () => {
    const result = parseImportFile(`${header}\nDE/best/1/binomial/foo\t1\t0.5`);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/unknown selection 'foo'/);
  });

  it("rejects an unknown crossover with a helpful message", () => {
    const result = parseImportFile(`${header}\nDE/best/1/bin/greedy\t1\t0.5`);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/unknown crossover 'bin'/);
  });

  it("rejects an unknown mutation with a helpful message", () => {
    const result = parseImportFile(`${header}\nDE/foo/1/binomial/greedy\t1\t0.5`);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/unknown mutation 'DE\/foo\/1'/);
  });

  it("rejects a benchmark outside 1-10", () => {
    for (const bad of ["0", "11", "abc"]) {
      const result = parseImportFile(`${header}\nDE/best/1/binomial/greedy\t${bad}\t0.5`);
      expect(result.ok).toBe(false);
      expect(result.errors[0].message).toMatch(/benchmark must be an integer between 1 and 10/);
    }
  });

  it("rejects a non-finite fitness value", () => {
    const result = parseImportFile(`${header}\nDE/best/1/binomial/greedy\t1\tabc`);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/lowestFitness must be a finite number/);
  });

  it("rejects an empty fitness value", () => {
    const result = parseImportFile(`${header}\nDE/best/1/binomial/greedy\t1\t`);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/lowestFitness is required/);
  });

  it("rejects duplicate (model, benchmark) pairs with the line number", () => {
    const content = [
      header,
      "DE/best/1/binomial/greedy\t1\t0.5",
      "DE/best/1/binomial/greedy\t1\t0.6",
    ].join("\n");
    const result = parseImportFile(content);
    expect(result.ok).toBe(false);
    expect(result.errors[0].line).toBe(3);
    expect(result.errors[0].message).toMatch(/Duplicate/);
  });

  it("rejects out-of-range metadata", () => {
    const result = parseImportFile(`# np=5\n${header}\nDE/best/1/binomial/greedy\t1\t0.5`);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/np must be between 10 and 40/);
  });

  it("rejects duplicate metadata keys", () => {
    const result = parseImportFile(`# np=15\n# np=20\n${header}\nDE/best/1/binomial/greedy\t1\t0.5`);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/Duplicate metadata key/);
  });

  it("reports no data rows when only a header is present", () => {
    const result = parseImportFile(header);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/No data rows found/);
  });
});
