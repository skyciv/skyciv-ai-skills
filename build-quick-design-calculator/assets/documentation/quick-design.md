---
id: quick-design
title: Quick Design Overview
noIndex: true
---

SkyCiv Quick Design is a robust framework designed for structural engineers, providing a streamlined approach to rapidly develop engineering solutions. With features like automatic UI generation, integrated reporting, and seamless hosting, it empowers engineers to create professional tools with efficiency and ease.

<center><img src="/api/v3/img/qd/qd_img.png"/></center>

## Quick Design Files

SkyCiv Quick Design runs off the following files. 

| File												  | Required | Description 																																	|
|-----------------------------------------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------|
| [config.json](/api/v3/docs/quick-design-config)     | TRUE 	 | Contains meta information for the calculator and a list of all the input variables your calculator uses.  									|
| [calculate.js](/api/v3/docs/quick-design-calculate) | TRUE 	 | Logic layer of your calculator. Takes the current input of your calculator and returns the results. The report is also built in this file. 	|
| [s3d_integration.js](/api/v3/docs/quick-design-s3d) | FALSE    | Required to integrate your calculator with S3D. Transforms the model and analysis results from S3D  into input to be ran in your calculator. |
| [ui.js](/api/v3/docs/quick-design-ui) 			  | FALSE    | Allows you to dynamically adjust your calculator's user interface using jQuery or equivalent DOM manipulation with JavaScript.   			|
| [renderer.js](/api/v3/docs/quick-design-renderer)   | FALSE    | Allows you to add a 3D rendering capabilities to your calculator using the SkyCiv Renderer.													|

## Quick Design Documentation

- [Units](/api/v3/docs/quick-design-units)
- [Reporting](/api/v3/docs/quick-design-reporting)
- [Advanced Features](/api/v3/docs/quick-design-advanced)

## Quick Design Libraries

- [SVG Creator](/api/v3/docs/quick-design-svg) 
- [Chart JS Integration](/api/v3/docs/quick-design-chartjs) 
- [Plotly JS Integration](/api/v3/docs/quick-design-plotlyjs) 
- [SVG Section Dimensions](/api/v3/docs/quick-design-sections) 
- [Setion Database Integration](/api/v3/docs/quick-design-sb-integration) 
- [Quick Design Section Properties](/api/v3/docs/quick-design-section-props) 

## Template Repository

To help you get started, SkyCiv has created some template repositories that can be downloaded directly from GitHub.

| Repository 	   | Link                                                                                       | 
| ---------------- | ------------------------------------------------------------------------------------------ | 
| Udemy Course     | https://github.com/skyciv/building-web-based-engineering-tools-with-javascript             | 
| Sample Repo      | https://github.com/skyciv/quick-design-sample                                              | 
| Minimal Template | https://github.com/skyciv/quick-design-template                                            | 

## Accessing SkyCiv Build Your Own Calculator

Once you have registered for a [SkyCiv Account](https://platform.skyciv.com/sign-up) you can access the Quick Design Builder [here.](https://platform.skyciv.com/quick-design?uid=build)

## Udemy Course

SkyCiv has put together a Udemy course to help you get started with SkyCiv Quick Design

[Udemy Course Link](https://www.udemy.com/course/building-web-based-engineering-tools-with-javascript)

## Publishing Calculators

To publish completed tools please email support@skyciv.com
