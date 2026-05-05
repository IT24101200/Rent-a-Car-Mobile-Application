# DriveEase: A Rent-a-Car-Mobile-Application

DriveEase is a mobile-first, peer-to-peer vehicle rental platform designed to connect private vehicle owners directly with customers. Developed for the **Web and Mobile Technology (SE2020)** module at **SLIIT**[cite: 1], the system replaces traditional paper-based processes with a secure, structured digital lifecycle for vehicle rentals.

---

## Group Details
**Group ID:** 2026_Y2_S2_KU AI 01

| Registration Number | Student Name |
| :--- | :--- |
| IT24101200 | Wickramasinghe H.M.D.A. |
| IT24101129 | Wijethunga W.M.K.A. |
| IT24100700 | Nawarathna H.M.P.P. |
| IT24103107 | Wijesekara W.M.H.P.M.B |
| IT24103123 | Gamlath K.G.C.G |
| IT24100311 | Panahatipola P.M.D.S. |

---

## System Overview
DriveEase addresses common issues in the peer-to-peer rental market, such as lack of accountability for vehicle damage, informal identity verification, and fragmented payment tracking.

### Core Objectives:
* **Identity Verification (KYC):** Secure registration for both owners and customers.
* **Full Trip Lifecycle:** Tracking rentals from booking to completion with photo and odometer evidence at every handover.
* **Standardized Payments:** Centralized bank slip uploads and staff-led approval/refund processes.
* **Analytical Oversight:** Dedicated dashboards for administrators to monitor revenue and platform performance.

---

## Tech Stack
* **Frontend:** React Native (via Expo SDK) for Android and iOS.
* **Backend:** Node.js & Express.js with a RESTful API.
* **Database:** MongoDB (User, Vehicle, Booking, Feedback, Report, and Notification collections).
* **Authentication:** JWT-based secure login.
* **File Handling:** Local file storage via Multer for KYC documents, vehicle photos, and payment slips.

---

## Key Modules
The system implements **Role-Based Access Control (RBAC)** supporting Customers, Car Owners, Admins, and specialized Staff roles:

* **Vehicle Management:** Owners list vehicles with legal documents and photos for staff approval.
* **Booking Management:** Handles the end-to-end rental process including check-in/check-out records.
* **Payment Management:** Staff review manual payment slips and handle refund processing.
* **Vehicle & User Validation:** KYC verification for customers and vehicle document validation.
* **Feedback Management:** Trip reviews and ratings with moderation capabilities.
* **Report Handling:** Generation of analytical snapshot reports on revenue and bookings.

---

## Features
* **Automated Notifications:** Real-time push alerts for trip status and overdue returns.
* **Evidence Collection:** Mandatory photo/odometer uploads during handovers to prevent disputes.
* **Content Moderation:** Staff can flag, annotate, or remove inappropriate feedback.
