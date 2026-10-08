# 2026-10-09 — Official total-space display

The Transport Department basic car-park record has a per-vehicle `space` field when an operator supplies the total capacity. It is distinct from live `vacancy`. `spaceEV` and `spaceDIS` are capacity classifications and are not summed into `space`.

The app now puts `總車位 N` first in the fixed card summary whenever that selected vehicle has an official `space` value. The detail panel always includes the selected vehicle’s total-space field; where the operator did not supply it, the panel states `官方未提供` rather than estimating from vacancy.

The checked-in official snapshot contains 135 supplied capacity values across 583 car parks and vehicle types. In a live static-build check around Kwun Tong, 13 nearby private-car cards exposed total capacity. For example, Landmark East showed `54 個空位` and `總車位 51`; its detail panel showed `私家車 總車位 51`.
