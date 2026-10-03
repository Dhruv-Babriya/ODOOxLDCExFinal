# The Champions Club - Final Demo Guide

This guide outlines the recommended end-to-end demonstration flow for The Champions Club Sports Management System. It ensures that all modules (Memberships, Courts, Shop, Bar, Finance, Staff, CRM) are showcased cohesively.

## Pre-requisites for Demo
1. Ensure the database is seeded with initial demo data.
2. Have two browser windows ready:
   - Window 1 (Incognito): Acting as a Guest / New Visitor / Standard Member.
   - Window 2 (Normal): Acting as the Club Owner (`owner@example.com`).

---

## The Demonstration Flow

### Part 1: Visitor Acquisition (CRM & Public Web)
*Persona: Unauthenticated Guest (Window 1)*
1. **Homepage & Info**: Open the public website root (`/`). Demonstrate the responsive, high-end design, navigating to `/courts` and `/shop`.
2. **Membership Preview**: Navigate to `/memberships`. Show the different tiers (Basic, Premium, Elite) and their pricing.
3. **Trial/Enquiry Registration**: Navigate to `/trial`. Fill out the guest registration form. Submit the enquiry. Note the success message and explain that this went directly into the Staff CRM.

### Part 2: Staff Operations & CRM Conversion
*Persona: Club Owner / Staff (Window 2)*
1. **Staff Dashboard**: Log into `/login` as the Owner. Navigate to `/dashboard/staff` to view the active shift roster and staff leave requests.
2. **CRM Enquiries**: Navigate to `/dashboard/enquiries`. Show the newly submitted trial request from Part 1. 
3. **Quote Generation**: Move the enquiry status from `NEW` to `CONTACTED`, then create a Membership Quote. 
4. **Member Creation**: Show the Member Directory (`/dashboard/members`) and demonstrate registering the visitor as an active `MEMBER` with an assigned `Membership Plan`. 

### Part 3: Member Experience (Courts, Shop, Bar)
*Persona: Registered Member (Window 1 - now logged in)*
1. **Portal**: Log into `/login` using the newly created member credentials. View the active membership status.
2. **Court Booking**: Navigate to `/dashboard/bookings` or `/dashboard/courts`. Select an available court slot for today, configure the duration, and book. Note that the GIST exclusion constraint prevents double-booking.
3. **Pro Shop Purchase**: Navigate to `/shop` or `/dashboard/shop`. Add an item (e.g., Tennis Racket) to the cart and checkout. Emphasize that inventory is atomically deducted.
4. **Cafeteria / Bar Tab**: Navigate to `/dashboard/bar`. Add items to the cart, select a table, and open a tab. 

### Part 4: Operations & Fulfillment
*Persona: Club Owner / Staff (Window 2)*
1. **Kitchen Fulfillment**: Go to `/dashboard/bar` (Staff View). Show the active kitchen ticket. Mark it as `PREPARING` and then `READY`.
2. **Tab Closure**: Close the active customer tab.
3. **Pro Shop Fulfillment**: Go to `/dashboard/shop` (Staff View). Show the operational queue and mark the shop order as fulfilled.

### Part 5: Finance & Reporting
*Persona: Club Owner (Window 2)*
1. **Invoicing**: Navigate to `/dashboard/invoices`. Show the auto-generated invoice for the Membership. Record a payment against it.
2. **Operational Payments**: Navigate to `/dashboard/payments`. Record payments for the Court Booking and the Bar Tab. Highlight the overpayment prevention validation.
3. **Owner Dashboard**: Navigate to `/dashboard/reports`. This is the climax of the demo:
   - Show the Total Revenue aggregated from Memberships, Courts, Shop, and Bar.
   - Show the "Open Tabs Balance" and "Low Stock Items" operational alerts.
   - Show the interactive charts depicting revenue distribution across the four streams.

---
*End of Demonstration*
