# Proposal: Scaffold App Layout

## Context
The application currently lacks a main application layout. We need a skeleton structure to house the core functionality (Capture, Export, Settings) and provide navigation between these views.

## Objectives
- Create a responsive application shell using Flowbite Vue and Tailwind CSS.
- Implement a global header with the app logo and navigation tabs.
- Set up client-side routing with Vue Router, mounted at `/u/`.
- Create placeholder views for Capture, Export, and Settings.
- Maximize screen real estate for the content area.

## Solution
We will implement a `AppLayout` component that serves as the parent route for the main section of the app. This layout will include the header and the `RouterView`.
The navigation will use tabs styled with Flowbite Vue components.
Routes will be configured to render the appropriate components based on the selected tab.

## Scope
- Frontend only.
- Dependencies: `flowbite-vue` (assumed available or will be added), `vue-router`.

## Risks
- Ensure Flowbite Vue integration works seamlessly with the existing Tailwind configuration.
