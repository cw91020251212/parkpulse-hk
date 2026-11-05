# 官方建築模型試點來源

建築資料及原始模型：© HKSAR Government, Lands Department（香港特別行政區政府地政總署）。政府及相關機構保留資料知識產權。

`nts-police.b3dm`為2026-11-06透過官方公開3D Spatial Data API示例、限定位置查證時下載的模型`B307012577101062E0`原始副本；不是Google、人工估高或第三方重建。它只用作新界南警察總部的精細模型試點。`nts-police-footprint.geojson`為同日官方Building FSDT API在114.12281,22.37106查得的輪廓與近似高程副本，用作可重複核對資料，並不是全港快照。

來源及免費下載／重製／分發條款：[CSDI官方3D Spatial Data API](https://portal.csdi.gov.hk/csdi-webpage/apidoc/3d-spatial-data-api)；[Building資料集](https://data.gov.hk/en-data/dataset/hk-landsd-openmap-landsd-building)；[CSDI Portal使用條款](https://portal.csdi.gov.hk/csdi-webpage/doc/TNC)。免費商用／非商用必須遵從條款、清楚標明政府及網站來源並承認政府及相關機構的知識產權。此資料不是CC0，來源不保證準確、完整或時效。

原始模型未附可確認的更新日期；取得日期不代表測量日期。派生輕型資產由`scripts/build-official-3d-mesh.py`可離線再現，保留來源与幾何高差，不聲稱測量級地形／垂直基準轉換。正式runtime不含或依賴公開示例API金鑰。日後全港模型串流應向地政總署申請網站自己的免費金鑰。詳細限制見[官方楼高说明](../../docs/official-building-heights.md)。
