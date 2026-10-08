import assert from 'node:assert/strict';
import { buildOnStreetParking } from '../lib/on-street-parking.mjs';

const meterLocations = `2026-10-09\n\nPoleId,ParkingSpaceId,Street_tc,SectionOfStreet_tc,Latitude,Longitude,VehicleType,OperatingPeriod,TimeUnit,PaymentUnit\n1,100A,桂林街,近長沙灣道,22.329,114.159,A,D,15,4.00\n`;
const meterStatus = `ParkingSpaceId,ParkingMeterStatus,OccupancyStatus,OccupancyDateChanged\n100A,N,V,10/09/2026 01:00:00\n`;
const nonMeterLocations = `2026-10-09\nFeatureID,ParkingSpaceId,Street_tc,SectionOfStreet_tc,Latitude,Longitude,VehicleType\n1,TRIAL1,新娘潭路,近巴士總站,22.502,114.238,A\n`;
const nonMeterStatus = `FeatureID,ParkingSpaceId,OccupancyStatus,OccupancyDateChanged\n1,TRIAL1,NU,10/09/2026 01:00:00\n`;
const result = buildOnStreetParking({ meterLocations, meterStatus, nonMeterLocations, nonMeterStatus, nonMeterSnapshot: true });
assert.equal(result.metered.length, 1);
assert.equal(result.metered[0].occupancy, 'vacant');
assert.equal(result.metered[0].paymentUnit, '4.00');
assert.equal(result.nonMetered.length, 1);
assert.equal(result.nonMetered[0].occupancy, 'unavailable');
assert.equal(result.nonMetered[0].snapshot, true);
console.log('On-street parking parser checks passed.');
