# GitHub Copilot Instructions for "The Walking Dog"

This document provides context and guidelines for AI agents working on this codebase.

## 🏗 Project Architecture

- **Framework**: Ruby on Rails 7.1.6 (Standard MVC architecture)
- **Language**: Ruby 3.3.5
- **Database**: PostgreSQL (Schema defined in `db/schema.rb`)
- **Frontend**:
  - **JS**: Hotwire (Turbo & Stimulus) via Importmap (No Webpack/Esbuild)
  - **CSS**: SCSS with a component-based architecture
  - **Assets**: Sprockets/Propshaft pipeline
- **Authentication**: Devise
- **Forms**: SimpleForm

## 📂 Key Directories & Conventions

- **Stylesheets** (`app/assets/stylesheets/`):
  - `application.scss`: Main entry point, imports partials.
  - `components/`: Reusable UI components (e.g., `_navbar.scss`, `_card.scss`).
  - `pages/`: Page-specific styles (e.g., `_home.scss`).
  - **Rule**: When adding styles, create/update partials in `components/` or `pages/` and ensure they are imported in `components/_index.scss` or `pages/_index.scss`.

- **Javascript** (`app/javascript/`):
  - `controllers/`: Stimulus controllers.
  - **Rule**: Use Stimulus for interactivity. Avoid inline `<script>` tags.
  - **Naming**: `kebab-case` for file names (e.g., `hello_controller.js`) maps to `data-controller="hello"`.

- **Views** (`app/views/`):
  - Standard ERB templates.
  - Use `simple_form_for` for forms.
  - Use `link_to` and Rails helpers over raw HTML tags.

## 🛠 Development Workflow

- **Server**: `bin/rails server` (or `rails s`)
- **Console**: `bin/rails console` (or `rails c`)
- **Database**:
  - Migrate: `bin/rails db:migrate`
  - Seed: `bin/rails db:seed`
- **Testing**:
  - Framework: Minitest (default Rails)
  - Run tests: `bin/rails test`
  - System tests: `bin/rails test:system`

## 📦 Key Dependencies

- `devise`: User authentication (`User` model).
- `simple_form`: Form handling.
-  favor svg from heroicons for icons
- `stimulus-rails` & `turbo-rails`: Frontend interactivity.
- `pg`: PostgreSQL adapter.

## 📝 Coding Guidelines

- **Ruby**: Follow standard Ruby style guide. Prefer readable code over clever one-liners.
- **Rails**:
  - Use "Fat Model, Skinny Controller" where possible.
  - Use `before_action` for repetitive controller setup.
  - Keep business logic in Models or Services (if complex).
- **CSS**:
  - Avoid inline styles.
  - Use the defined color palette variables if available (check `_variables.scss` or `config` files).
  - Nest CSS selectors in SCSS for readability but avoid excessive nesting depth (>3 levels).
## 🔍 Common Patterns

- **Navbar**: Located in `app/views/layouts/_navbar.html.erb` and styled in `app/assets/stylesheets/components/_navbar.scss`.
- **Image Assets**: Stored in `app/assets/images/`. Reference with `image_tag` or `asset_path`.
