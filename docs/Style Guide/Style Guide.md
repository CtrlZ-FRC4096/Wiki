---
title: Style Guide
nav_order: 4.7
---

# Contribution Style Guide
This is modified from [FRCDesign]

## Futureproofing and Usefulness

To make the content you write useful for team members of all resource levels, while maintaining validity in the future, the goal isn’t to go broad and shallow, but to go extra deep to equip students with the understanding of the underlying fundamentals behind concepts to apply to their own unique situations. Pros and cons are context dependent while fundamentals are universal.

At the same time, things not accessible and/or commonly used by the team, or outdated information, should either be tagged as out of date or shouldn’t be included to prevent confusion.

On the other hand, including small details that you’d only discover through actually making the thing tends to be a lifesaver for everyone (such as electrical taping cat-tongue tape to make it not peel).

We want to include information on not only how Ctrl-Z does things, but also WHY. New methods and products come out all the time but overall concepts and practices stay similar.

## Inspired by gm0's Style Guide (mostly for CAD but applicable elsewhere)

Don’t deal in absolutes.

- Only a Sith deals in absolutes
- Use pros/cons lists to compare options
- Explain WHY something is good or bad
  - For example, we all know deadaxle pivots are better than liveaxle. But don’t just say they’re better, say: "Deadaxles have a higher second moment of area as the torque being directly transferred to the part. As a result your pivot is significantly more robust and less prone to breaking.
    ”
  - Similarly, we know the Kraken motors are generally good. But explain why they are good, e.g. “We would recommend using Krakens on your drivetrain because they are extremely high torque motors and will improve your acceleration. In addition, they have integrated Talon FX motor controllers that make them easier to wire and feature a high resolution encoder which will help the precision of your swerve odometry. Keep in mind that Kraken motors are not yet compatible with stock REV Maxswerve modules and require an extra adaptor from WCP to mate with other existing modules.”
- Still emphasize that team members are free to explore and innovate, but help set realistic expectations (see the following point)

The Ctrl-Z Wiki is a guide **for best practices**.

- Try to leave out stuff that doesn’t work well and is unpopular; if it is popular it is worth explaining the disadvantages (See tank drive vs mecanum drive; explaining tank drive, as a relatively popular and simple drivetrain makes sense, but mecanum drive, a drivetrain that no longer makes sense in the era of swerve and has little-to-no pushing power or traction.)
- Try to leave opinions out as much as possible. Do not speak authoritatively on stuff you do not have first-hand experience with whenever possible

Keep in mind that FRC design trends are temporary and transient.

- Just because something is popular one season doesn’t mean it’s the end all be all. There was a time when WCD and sheet metal superstructures was all the rage, but that doesn’t mean that we should recommend them in this guide. Try your best to think about why something is popular, and what benefits in design, function, and execution they actually bring to the table.

## Standards

### File Formats:

- Compress images to .webp format using [squoosh](https://squoosh.app/ "sqoosh Image Compressor"){:target="\_blank"}
- Embed longer videos using a Youtube embed, and shorter videos with a webm file
- Add images by using `<center><img src="absolute link" width="x%"></center>`

### Brand Standards

Learn here how to use the team [Logo] and colors.

You can use “you” when writing, when it makes writing less awkward. However, try avoiding excessively using it.

### Links:

- External links should open in a new tab: `[Link Text](link_url "Link Title"){:target="_blank"}`
  - Links to CAD documents should use a large centered button: `<center markdown>[Link Text](link_url "Link Title"){:target="_blank" .md-button .md-button--primary}</center>`
  - Link titles for Onshape documents should be `[Document name] Onshape Document`
- Internal links should open in the current tab and use a relative link: `[Link Text](relative_link "Link Title")`
  - Link titles for internal links should be in the format: `"[Page Name] Page"`

<br>

----

[FRCDesign]: https://www.frcdesign.org/contribution/styleguide/
[Logo]: https://docs.google.com/document/d/1grZ98phe5G4r9hgPATwam79MHJvCJt76-hwFRsOU9bo/edit?tab=t.0#heading=h.x6lbkc9gqzma