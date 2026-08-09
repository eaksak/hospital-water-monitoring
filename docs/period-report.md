# Period monitoring and analytical report

## Purpose

The period report turns the populated monthly rows in `Raw_Water_Data` into a management view for a chosen start and end month. It is intended for facilities monitoring, review meetings, and PDF evidence. It does not replace operational verification of tank levels, meters, or emergency procedures.

## Staff workflow

1. Complete and verify the monthly water, OPD, Patient Day, and building-meter inputs.
2. Open the secure tokenized web-dashboard URL.
3. Choose the reporting period and select **แสดงรายงาน**.
4. Check the four KPI cards and charts for unexpected movement.
5. Review every item under **บทวิเคราะห์และข้อเสนอแนะ**.
6. Resolve any **ความครบถ้วนของข้อมูล** warning in the source sheets and refresh the report.
7. Select **ส่งออก PDF**, review the preview, and save the approved file using the hospital's document-naming convention.

## Report sections

| Section | What it shows | Review question |
|---|---|---|
| Period KPIs | Total and average use, latest use, reserve volume, and reserve days | Does the current situation agree with operational records? |
| Source composition | Municipal and on-site production volumes and shares | Is the hospital too dependent on one source? |
| Service-load efficiency | Liters per OPD and liters per Patient Day | Is consumption changing after accounting for service activity? |
| Reserve safety | Monthly days available against critical and warning thresholds | Were critical or warning months investigated? |
| Building variance | Actual use minus target for each building | Which building should be checked first? |
| Analytical report | Calculated findings and action-oriented recommendations | Are findings supported by complete data and assigned for action? |
| Six-month detail | Latest six populated months inside the selected period | Can reviewers trace the headline conclusions to monthly values? |

## Calculation rules

- **Selected total** is the sum of monthly total water use inside the inclusive range.
- **Average monthly use** is selected total divided by the number of populated months.
- **Previous-period comparison** uses the immediately preceding equal number of populated months. It is omitted when there is not enough preceding history for an equal-length comparison.
- **Source share** is each source total divided by total consumption.
- **Efficiency averages** use positive populated KPI values, avoiding division by a missing service-load denominator.
- **Critical reserve** means days available are below the configured critical threshold.
- **Warning reserve** means days available are from the critical threshold through the configured warning threshold, inclusive.
- **Building variance** is actual building use minus its configured monthly target. A positive value means over target.
- **Data-quality warnings** count missing OPD, Patient Day, reserve, and all-zero building-meter months.

## Interpretation controls

- Findings are deterministic rules based only on current Sheet data; they are not clinical guidance and are not AI-generated predictions.
- A high or low month is an observation, not proof of leakage or equipment failure.
- Efficiency metrics must be interpreted with hospital activity, seasonal conditions, maintenance, and unusual events.
- Building conclusions depend on correct meter-to-building mapping and approved targets in `Master_Building`.
- A PDF should not be approved while the report shows unresolved data-quality warnings.

## PDF export

The **ส่งออก PDF** button opens the browser print dialog. Use A4 landscape, enable background graphics, and choose **Save as PDF / บันทึกเป็น PDF**. The print layout hides filters and control buttons, keeps report headings and thresholds, and preserves the SVG charts as print-quality graphics.
