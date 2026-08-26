const fs = require("fs");
const path = require("path");

// Simple YAML parser for basic key: value pairs
function parseYaml(content) {
  const obj = {};
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const match = trimmed.match(/^([^:]+):\s*"(.*)"/);
      if (match) {
        obj[match[1]] = match[2];
      }
    }
  }
  return obj;
}

// Load YAML data from _data directory tree
function loadYamlData(dir) {
  const data = {};
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Recursively load subdirectories
      data[entry.name] = {};
      const subEntries = fs.readdirSync(fullPath, { withFileTypes: true });
      for (const subEntry of subEntries) {
        if (subEntry.isFile() && subEntry.name.endsWith(".yml")) {
          const yamlPath = path.join(fullPath, subEntry.name);
          const content = fs.readFileSync(yamlPath, "utf8");
          const key = subEntry.name.replace(".yml", "");
          data[entry.name][key] = parseYaml(content);
        }
      }
    }
  }
  return data;
}

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/img");

  // Collections
  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").reverse();
  });

  // Filters
  eleventyConfig.addFilter("dateFormat", function(date) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric"
    });
  });

  eleventyConfig.addFilter("limit", function(arr, limit) {
    return arr.slice(0, limit);
  });

  // Load global data from _data directory
  const yamlData = loadYamlData("src/_data");
  for (const [key, value] of Object.entries(yamlData)) {
    eleventyConfig.addGlobalData(key, value);
  }

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts"
    }
  };
};
