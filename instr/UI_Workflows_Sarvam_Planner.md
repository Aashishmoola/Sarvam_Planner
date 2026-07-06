# UI Workflows — Productivity App Spec

## 1. App Configuration & Limits

- **Max limit on goals and productive hours**
  - Set previously upon entering the app (initial onboarding value)
  - Default is set **low**
  - Adjusted **algorithmically** based on completion metrics over time
  - *Internal User Config State Changed*

## 2. Goal Creation Page

- **Long-term goals**
  - Create up to **3** long-term goals
  - Remain active until marked completed (no fixed end date)
- **Short-term goals**
  - Create up to **3** specific short-term goals
  - Tied to a **habit-forming adjustment period**
  - Each goal has a defined/set time period
  - *Internal User Config State Changed*

## 3. Motto Configuration

- **Set 5 mottos**
  - Serve as daily motivation / personas to live up to
  - Rationale for the number 5:
    - Balances **overstimulation** and **contradiction** (too many)
    - Against **monotony** (too few)
  - *Internal App Config State Changed*

## 4. Daily Productivity Hours Setting

- **Time block configuration**
  - Option to **color-code** time blocks
  - Option to **label** time blocks
  - Based on user-known **low-focus** and **high-focus** periods
  - *Internal App Config State Changed*

## 5. Daily Goal-Setting Flow

- **Start new goal-setting session for the current day**
  - Short-term goals are **pre-filled** by default
  - Short-term goals can be **updated** if:
    - The current cycle is ending, **or**
    - The failure threshold is reached (2 consecutive / X non-consecutive failures)
- **Assigning goals to the day**
  - Short-term goals can be assigned into a **time block**
  - Day is displayed in a **24-hour calendar view**
  - Sleeping hours are **minimized** in the view
  - **Warning** triggered if a short-term goal is assigned to a non-focus hour
- **Non-productive (enjoyment) goals**
  - Set **3** non-productive goals for the day
- **Goal detail / journaling**
  - Each goal supports added details, e.g.:
    - Mood
    - Slight tweaks in technique/approach
    - Content/notes on the actual task

## 6. Navigation & Progress View

- **Swipe left** → view previous day's goals (conveyor-belt style navigation)
- **Progress statistics**
  - Displayed in the **top-right corner** of the screen

## 7. Goal Completion Interaction

- **Each short-term goal (productive and non-productive) has two controls:**
  - **Check** → signals completion
  - **Cross** → signals failure
- **Confirmation prompt on check**
  - Popup: *"Are you sure you truthfully completed this goal?"* (Hooray pop-up on confirm)
  - Popup: *"Are you sure you were not able to complete this goal?"* (on failure confirm)
  - *User Data Changed*

## 8. Daily Check-In Flow

- **Trigger**
  - Push notification after waking up (browser, mobile, or desktop)
  - Intended as the **only required app interaction** of the day
  - Rationale: conscientiousness is *developed*, not assumed — even less-conscientious users act on free will through most of the day
- **Check-in contents**
  - **Present motto** — cycles through each of the 5 mottos
  - **Reminder**: goals must be checked off by **12 noon**, or they are auto-marked as failed
  - **Reminder**: add goal details / adjust short-term goals if needed

## 9. Internal Computation & Adjustment Engine

- **Effort tracking**
  - Effort must be tracked as an additional metric (to be implemented)
- **Short-term goal demotion**
  - Trigger: **2 consecutive** failures **or X non-consecutive** failures
  - Action: goal is **demoted** (made more achievable)
- **Short-term goal promotion**
  - Trigger: goal completed through **1 full cycle period**
  - Action: goal is **promoted** (made more demanding)
    - Additional productive time is assigned
    - Time slot can be **split further** if it exceeds **45 minutes**
- **Non-productive goal handling**
  - **No** promotion or demotion applied
  - **Warning only** if a set threshold (X amount) is missed within a **2-day** window
