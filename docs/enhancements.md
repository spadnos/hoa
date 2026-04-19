# Possible Enhancements

## Fix Management Contacts

They are currently hard-coded, but should be from the management group.

## Agents

Handle common tasks like updating all the things that need to be updated when a property is sold.

## Group ordering

Some groups, like the board, should be presented in a specific order.

## Dirctory Enhancements

- Display alphabetically, this might require splitting names to first, last.
- Include non-owners, such as employees and management.
- Chnage filters to be members, non-members
- Maybe color code members vs non-members?

## Lot photos

Allow people to add a profile photo for their house/lot.

## Plan review agent

Add an agent that will review plans attached to a project and compare them to the guidelines.

## Announcements

- Add an optional date or link to "events" (which don't exist yet) for things like meetings.
- Add attachments or links to docs for things like "Board Meeting Minutes" or updated CCRs.

## Add Guardrails on agent so it can't be used as a general chatbot

## Separate Data and Code

Put the data in a separate location. This would allow the data to go in a shared locations, such as Dropbox, Google Drive, etc.

The code would then be used to interact with the data. The current local client would not work well since each user would need to install it and run a server, which is more than I want to ask users to do.

## Extract Emails

**Status:** pending

Scan my inbox and find emails related to any of the projects. Add the information to the db.

## Add Sections for Designers and Contractors

**Status:** completed

The ACC may need to deal with the designer(s) and/or contractors. Add them as top-level contacts similar to Owners.

## Enhanced Contact Information

**Status:** completed

For each contact (owners, contractors, desginers) include more detailed contact info, if available, including email, phone, etc.

## ACC and Board Member Lists

**Status:** completed

This is note project specific data. Create a file(s) with a list of ACC members and their contact information. Create a separate list of the current HoA Board members and their contact info. These lists may be in the same or different files.

## Deadline Tracking

**Status:** pending

ACC reviews have time limits (e.g., 30-day review windows). Track due dates on reviews and flag overdue items in the chatbot.

## Inspection Log

**Status:** pending

Record site inspection dates, inspector, and outcome per project. New residences typically require multiple inspections at different construction phases.

## Fee Payment Reminders

**Status:** pending

Alert when unpaid fees are coming due based on upcoming status transitions.

## Fee Ledger / Outstanding Balance Report

**Status:** pending

Aggregate view of all fees across all projects — what has been paid vs. what is outstanding.

## Document Index Per Project

**Status:** pending

A structured list of submitted documents (plans, surveys, soils reports) with submission dates and review status, rather than just an unstructured files directory.

## Condition Tracking

**Status:** pending

Approvals often come with conditions (e.g., "landscaping plan required before construction start"). Track these as discrete items that can be checked off as satisfied.

## Revision History

**Status:** pending

Track when plans are revised and resubmitted, with version numbers and dates.

## Annual Activity Report

**Status:** pending

Summary of all projects opened/closed per year, fees collected, and common issues. Useful for board meetings.

## Homeowner-Facing Status Page

**Status:** pending

A read-only summary of a project's status that could be emailed or linked to a homeowner, without exposing internal ACC notes.

## Meeting Agenda Generation

**Status:** pending

For ACC meetings, auto-generate an agenda listing all active projects with their current status and any pending decisions.
