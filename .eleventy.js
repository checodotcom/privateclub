module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("src/admin");

  // Collections
  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").reverse();
  });

  // Filters
  eleventyConfig.addFilter("dateFormat", function(date) {
    const d = new Date(date);
    const day = d.toLocaleDateString("es-ES", { day: "numeric", timeZone: "UTC" });
    const month = d.toLocaleDateString("es-ES", { month: "long", timeZone: "UTC" });
    const year = d.toLocaleDateString("es-ES", { year: "numeric", timeZone: "UTC" });
    return `${day}/${month}/${year}`;
  });

  eleventyConfig.addFilter("limit", function(arr, limit) {
    return arr.slice(0, limit);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts"
    }
  };
};
