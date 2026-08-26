const markdownIt = require("markdown-it")({ html: true });

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("src/admin");

  // Collections
  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").reverse();
  });

  eleventyConfig.addCollection("tagList", function(collectionApi) {
    const tagSet = new Set();
    collectionApi.getAll().forEach(item => {
      (item.data.tags || []).forEach(tag => {
        if (tag !== "posts") tagSet.add(tag);
      });
    });
    return [...tagSet].sort();
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

  eleventyConfig.addFilter("markdown", function(content) {
    return markdownIt.render(content || "");
  });

  eleventyConfig.addFilter("spotifyEmbedUrl", function(url) {
    const match = String(url || "").match(/open\.spotify\.com\/(playlist|album|track|show|episode)\/([a-zA-Z0-9]+)/);
    return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}` : "";
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
