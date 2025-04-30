# Ctrl-Z Technical Documentation

This is a Wiki for Ctrl-Z technical details to help transfer knowlege and train new members and mentors:

The site is built and published on [GitHub Pages] using a gem based approach:
- uses a customized [Just the Docs] theme;
- uses the [GitHub Pages / Actions workflow] to build and publish the site on GitHub Pages;
- can be built and previewed locally, and may eventually be added to our [team site];

## Content Policy

This Wiki is designed for internal team use but may include resources we want to publish to the larger FIRST community.
- Try to communicate information with concise technical writing.
- Use spell check and try to follow existing formats and the Style Guide in the About section
- Use consistent terminology and define terms wherever applicable. Assume readers are rookie FRC members.
- Give references to outside resources. We use many resources from other teams and we need to link them.
- You can link your own slides, documents, and videos. Make sure they are publically assessble and in a future proof location.
- Use figures and images to explain ideas.
- AI is fine for content generation but do not make slop.

## Contributing

Team members are encouraged to add information to the wiki.
- Only add and modify Markdown (.md) files in the documents sections.
- Add images to the assets/images folder.
- Please do not change anything else unless you know what you are doing.
- Ask for help on slack or open issues in Github.
- If something breaks say something. It is ok to make mistakes and we have version control to keep work safe.
- Althought not preferred, if you are uncomfortable writing markdown you can create a Google Doc on the team Drive with the content and send the link.

## Building and previewing your site locally

1. Clone this repo to VSCode or your preferred editor.

Assuming  and [Bundler] are installed on your computer:

2.  Change your working directory to the root directory of your site.

3.  Follow the guides here to install [Jekyll] on your operating system:  You will need to install [Ruby] if you are on Windows.

4.  Run `bundle install`.

5.  Run `bundle exec jekyll serve` to build your site and preview it at `localhost:4000`. Changes you make locally will be updated automatically in the preview.

    The built site is stored in the directory `_site`.

## Publishing the built site on a different platform

Just upload all the files in the directory `_site`.

## Changing the version of the theme and/or Jekyll

Simply edit the relevant line(s) in the `Gemfile`.

## Adding a plugin

The Just the Docs theme automatically includes the [`jekyll-seo-tag`] plugin.

To add an extra plugin, you need to add it in the `Gemfile` *and* in `_config.yml`. For example, to add [`jekyll-default-layout`]:

- Add the following to your site's `Gemfile`:

  ```ruby
  gem "jekyll-default-layout"
  ```

- And add the following to your site's `_config.yml`:

  ```yaml
  plugins:
    - jekyll-default-layout
  ```

Note: If you are using a Jekyll version less than 3.5.0, use the `gems` key instead of `plugins`.

----

[^1]: [It can take up to 10 minutes for changes to your site to publish after you push the changes to GitHub](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/creating-a-github-pages-site-with-jekyll#creating-your-site).

[Jekyll]: https://jekyllrb.com/docs/installation/
[Ruby]: https://rubyinstaller.org/
[Just the Docs]: https://just-the-docs.github.io/just-the-docs/
[GitHub Pages]: https://docs.github.com/en/pages
[GitHub Pages / Actions workflow]: https://github.blog/changelog/2022-07-27-github-pages-custom-github-actions-workflows-beta/
[Bundler]: https://bundler.io
[use this template]: https://github.com/just-the-docs/just-the-docs-template/generate
[`jekyll-default-layout`]: https://github.com/benbalter/jekyll-default-layout
[`jekyll-seo-tag`]: https://jekyll.github.io/jekyll-seo-tag
[MIT License]: https://en.wikipedia.org/wiki/MIT_License
[starter workflows]: https://github.com/actions/starter-workflows/blob/main/pages/jekyll.yml
[actions/starter-workflows]: https://github.com/actions/starter-workflows/blob/main/LICENSE
[team site]: https://wiki.team4096.org/
