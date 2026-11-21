module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy({ "public/imgs": "imgs", "public/files": "files" });

  // 作品集合：按 num 排序
  eleventyConfig.addCollection("projects", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/projects/*.md").sort(function (a, b) {
      return String(a.data.num || "99").localeCompare(String(b.data.num || "99"));
    });
  });

  // 把扁平 images 列表按 row 字段分组成“行”：1 张=整幅，2 张=双栏
  eleventyConfig.addFilter("rows", function (images) {
    if (!Array.isArray(images) || images.length === 0) return [];
    const out = [];
    let cur = null;
    for (const img of images) {
      const key = img.row != null ? 'r' + img.row : 's' + img.src;
      if (!cur || cur.key !== key) { cur = { key, list: [img] }; out.push(cur); }
      else { cur.list.push(img); }
    }
    return out.map(function (c) { return c.list; });
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"]
  };
};
