import React, { useState } from "react";
import "./App.css";

import { initialParkingMapValue } from "./initialValue";

function App() {
	const [parkingMap, setParkingMap] = useState(initialParkingMapValue);
	const [parkingRecord, setParkingRecord] = useState<{ plateNumber: string; start: string; end: string; payment: number }[]>(
		[]
	);
	const [enteryInput, setEnteryInput] = useState({
		carSize: "S",
		entranceLetter: "A",
		plateNumber: "P01",
		start: "2022-08-31T01:00",
	});
	const [exitInput, setExitInput] = useState({
		plateNumber: "P01",
		end: "2022-08-31T02:30",
	});
	const [errorMessage, setErrorMessage] = useState("");
	const [refresh, setRefresh] = useState(true);

	const carEntry = () => {
		// Check for missing field
		const { carSize, entranceLetter, plateNumber, start } = enteryInput;
		if (!carSize || !entranceLetter || !plateNumber || !start) {
			return setErrorMessage("Missing car entry input");
		}

		// Set the entrance coordinate
		let entrance = { x: 0, y: 0 };
		switch (entranceLetter) {
			case "A":
				entrance = { x: 0, y: 1 };
				break;

			case "B":
				entrance = { x: 7, y: 0 };
				break;

			case "C":
				entrance = { x: 10, y: 1 };
				break;
		}

		// Check for the availibity of slot based on size and open slot
		const available = parkingMap.filter(slot => {
			if (slot.status == "O" && carSize == "S" && (slot.size == "S" || slot.size == "M" || slot.size == "L")) return slot;
			else if (slot.status == "O" && carSize == "M" && (slot.size == "M" || slot.size == "L")) return slot;
			else if (slot.status == "O" && carSize == "L" && slot.size == "L") return slot;
		});
		if (available.length == 0) {
			return setErrorMessage("No available slot for this vehicle");
		}

		// Check for the existing plate number that is currently parked
		if (parkingRecord.find(item => item.plateNumber == plateNumber && item.end == "")) {
			return setErrorMessage("The vehicle is currently parked");
		}

		// Check for the start date if it exceed the end time of last transaction
		if (
			parkingRecord.length > 0 &&
			parkingRecord.find(item => item.plateNumber == plateNumber && start < item.end) !== undefined
		) {
			return setErrorMessage(
				"You cannot travel back to time, the start date must be greater than the recorded end date transaction of the vehicle"
			);
		}

		// Hours difference of last transaction and start date time
		const hoursDifference =
			(new Date(start).getTime() -
				new Date(`${parkingRecord.find(item => item.plateNumber == plateNumber && item.end != "")?.end}`).getTime()) /
			3600000;

		// Append to existing transaction if the difference of last transaction and enter time does not exceed 1 hour
		if (hoursDifference <= 1) {
			const lastTransactionIndex = parkingRecord.findIndex(item => item.plateNumber == plateNumber && item.end != "");
			let updatesParkingRecord = parkingRecord;
			updatesParkingRecord[lastTransactionIndex].end = "";
			updatesParkingRecord[lastTransactionIndex].payment = 0;
			setParkingRecord(updatesParkingRecord);
		} else {
			// Create new transaction if last transaction and enter time does exceed 1 hour
			setParkingRecord([
				{
					plateNumber,
					start,
					end: "",
					payment: 0,
				},
				...parkingRecord,
			]);
		}

		// Retrieve the distance of all open slots
		const slotDistance: any = [];
		available.map(item => {
			slotDistance.push({
				x: item.x,
				y: item.y,
				distance:
					Math.abs(item.x - entrance.x) + Math.abs(item.y - (entrance.y == 0 || entrance.y == 2 ? 1 : entrance.y)),
			});
		});

		// Sort them from nearest to farthest
		slotDistance.sort((a: any, b: any) => {
			if (entrance.y == 2) return a.distance - b.distance || b.y - a.y;
			return a.distance - b.distance || a.y - b.y;
		});

		// Assign the parking map slot to vacant
		const parkingIndex = parkingMap.findIndex(item => item.x === slotDistance[0].x && item.y === slotDistance[0].y);
		let updatedParkingMap = parkingMap;
		updatedParkingMap[parkingIndex].status = "V";
		updatedParkingMap[parkingIndex].plateNumber = plateNumber;
		setParkingMap(updatedParkingMap);
		setRefresh(!refresh);
	};

	const carExit = () => {
		// Check for missing field
		const { plateNumber, end } = exitInput;
		if (!plateNumber || !end) {
			return setErrorMessage("Missing car exit input");
		}

		const parkingMapIndex = parkingMap.findIndex(item => item.plateNumber == plateNumber);
		const parkingRecordIndex = parkingRecord.findIndex(item => item.plateNumber == plateNumber && item.end == "");

		// Checks if the vehicle exist in current parking lot
		if (parkingRecordIndex == -1) {
			return setErrorMessage("The vehicle does not exist in the parking lot");
		}

		// Checks if the start time is greater than end time
		if (!(parkingRecordIndex != -1 && end > parkingRecord[parkingRecordIndex].start)) {
			return setErrorMessage("The start time should be greater than the end time");
		}

		// Free the parking map slot
		const updatedparkingMap = parkingMap;
		updatedparkingMap[parkingMapIndex].plateNumber = "";
		updatedparkingMap[parkingMapIndex].status = "O";
		setParkingMap(updatedparkingMap);

		// Record the parking transaction
		const updatedParkingRecord = parkingRecord;
		updatedParkingRecord[parkingRecordIndex].end = end;

		// Get the hour difference of start datetime and end datetime of parking
		const parkingTime = Math.round(
			(new Date(updatedParkingRecord[parkingRecordIndex].end).getTime() -
				new Date(updatedParkingRecord[parkingRecordIndex].start).getTime()) /
				3600000
		);

		// Set the rate for each size
		updatedParkingRecord[parkingRecordIndex].payment = 40; // first 3 hours payment does not count after the 24hours
		switch (updatedparkingMap[parkingMapIndex].size) {
			case "S":
				if (parkingTime >= 24)
					updatedParkingRecord[parkingRecordIndex].payment +=
						Math.floor(parkingTime / 24) * 5000 + (parkingTime % 24) * 20 - 40;
				else if (parkingTime > 3) updatedParkingRecord[parkingRecordIndex].payment += (parkingTime - 3) * 20;
				break;

			case "M":
				if (parkingTime >= 24)
					updatedParkingRecord[parkingRecordIndex].payment +=
						Math.floor(parkingTime / 24) * 5000 + (parkingTime % 24) * 60 - 40;
				else if (parkingTime > 3) updatedParkingRecord[parkingRecordIndex].payment += (parkingTime - 3) * 60;
				break;

			case "L":
				if (parkingTime >= 24)
					updatedParkingRecord[parkingRecordIndex].payment +=
						Math.floor(parkingTime / 24) * 5000 + (parkingTime % 24) * 100 - 40;
				else if (parkingTime > 3) updatedParkingRecord[parkingRecordIndex].payment += (parkingTime - 3) * 100;
				break;
		}
		setParkingRecord(updatedParkingRecord);
		setRefresh(!refresh);
	};

	const LengedDisplay = () => (
		<div className="section-center-container">
			<div className="section-container">
				<span>
					Car Size: S || M || L <br />
					Entrance: A || B || C (A: Left, B: Top, C: Right) <br />
					PlateNumber: P01 - P25 <br />
					Open: Green, Vacant: Red, Gray: Road
				</span>
			</div>
		</div>
	);

	const ParkingMapDisplay = () => (
		<div className="parking-parent-container">
			<div className="parking-container">
				{parkingMap.map((item, index) => {
					return (
						<div
							key={index}
							className={`map-block ${item.status == "O" ? "bg-green" : item.status == "V" ? "bg-red" : "bg-gray"}`}
						>
							<span className={` ${item.status == "O" ? "bg-green" : item.status == "V" ? "bg-red" : "bg-gray"}`}>
								{item.status == "R" ? `` : `${item.size} | ${item.plateNumber ? item.plateNumber : "000"}`}
							</span>

							<img
								src={
									item.status == "V"
										? require("./assets/images/car01.png")
										: require("./assets/images/car02.png")
								}
								alt="car"
								className="car-img-container"
							/>
						</div>
					);
				})}
			</div>
		</div>
	);

	const CarEntryInput = () => (
		<div>
			<input
				type="datetime-local"
				name="start"
				id="start"
				value={enteryInput.start}
				onChange={e => setEnteryInput({ ...enteryInput, [e.target.name]: e.target.value })}
			/>

			<select
				name="carSize"
				id="carSize"
				onChange={e => setEnteryInput({ ...enteryInput, [e.target.name]: e.target.value })}
			>
				<option value="S">Small</option>
				<option value="M">Medium</option>
				<option value="L">Large</option>
			</select>

			<select
				name="entranceLetter"
				id="entranceLetter"
				onChange={e => setEnteryInput({ ...enteryInput, [e.target.name]: e.target.value })}
			>
				<option value="A">Entrance A (LEFT)</option>
				<option value="B">Entrance B (TOP)</option>
				<option value="C">Entrance C (RIGHT)</option>
			</select>

			<select
				name="plateNumber"
				id="plateNumber"
				onChange={e => setEnteryInput({ ...enteryInput, [e.target.name]: e.target.value })}
			>
				<option value="P01">VEHICLE P01</option>
				<option value="P02">VEHICLE P02</option>
				<option value="P03">VEHICLE P03</option>
				<option value="P04">VEHICLE P04</option>
				<option value="P05">VEHICLE P05</option>
				<option value="P06">VEHICLE P06</option>
				<option value="P07">VEHICLE P07</option>
				<option value="P08">VEHICLE P08</option>
				<option value="P09">VEHICLE P09</option>
				<option value="P10">VEHICLE P10</option>
				<option value="P11">VEHICLE P11</option>
				<option value="P12">VEHICLE P12</option>
				<option value="P13">VEHICLE P13</option>
				<option value="P14">VEHICLE P14</option>
				<option value="P15">VEHICLE P15</option>
				<option value="P16">VEHICLE P16</option>
				<option value="P17">VEHICLE P17</option>
				<option value="P18">VEHICLE P18</option>
				<option value="P19">VEHICLE P19</option>
				<option value="P20">VEHICLE P20</option>
				<option value="P21">VEHICLE P21</option>
				<option value="P22">VEHICLE P22</option>
				<option value="P23">VEHICLE P23</option>
				<option value="P24">VEHICLE P24</option>
				<option value="P25">VEHICLE P25</option>
			</select>

			<input
				type="button"
				value="Car Entery"
				onClick={() => {
					setErrorMessage("");
					carEntry();
				}}
			/>
		</div>
	);

	const CarExitInputDisplay = () => (
		<div>
			<input
				type="datetime-local"
				name="end"
				id="end"
				value={exitInput.end}
				onChange={e => setExitInput({ ...exitInput, [e.target.name]: e.target.value })}
			/>

			<select
				name="plateNumber"
				id="plateNumber"
				onChange={e => setExitInput({ ...exitInput, [e.target.name]: e.target.value })}
			>
				<option value="P01">VEHICLE P01</option>
				<option value="P02">VEHICLE P02</option>
				<option value="P03">VEHICLE P03</option>
				<option value="P04">VEHICLE P04</option>
				<option value="P05">VEHICLE P05</option>
				<option value="P06">VEHICLE P06</option>
				<option value="P07">VEHICLE P07</option>
				<option value="P08">VEHICLE P08</option>
				<option value="P09">VEHICLE P09</option>
				<option value="P10">VEHICLE P10</option>
				<option value="P11">VEHICLE P11</option>
				<option value="P12">VEHICLE P12</option>
				<option value="P13">VEHICLE P13</option>
				<option value="P14">VEHICLE P14</option>
				<option value="P15">VEHICLE P15</option>
				<option value="P16">VEHICLE P16</option>
				<option value="P17">VEHICLE P17</option>
				<option value="P18">VEHICLE P18</option>
				<option value="P19">VEHICLE P19</option>
				<option value="P20">VEHICLE P20</option>
				<option value="P21">VEHICLE P21</option>
				<option value="P22">VEHICLE P22</option>
				<option value="P23">VEHICLE P23</option>
				<option value="P24">VEHICLE P24</option>
				<option value="P25">VEHICLE P25</option>
			</select>
			<input
				type="button"
				value="Car Exit"
				onClick={() => {
					setErrorMessage("");
					carExit();
				}}
			/>
		</div>
	);

	const ErrorMessage = () => <h3 className="txt-red">{errorMessage}</h3>;

	const ParkingHistoryDisplay = () => (
		<div>
			{parkingRecord.map((item, index) => (
				<div key={index}>
					<span>{`${item.plateNumber} | ${item.start} | ${item.end ? item.end : "parking"} | ${
						item.end ? ` ₱${item.payment}` : "parking"
					}`}</span>
				</div>
			))}
		</div>
	);

	return (
		<div className="parent">
			<LengedDisplay />
			<ParkingMapDisplay />
			<div className="section-center-container">
				<div className="section-container">
					{CarEntryInput()}
					{CarExitInputDisplay()}
					<ErrorMessage />
					<ParkingHistoryDisplay />
				</div>
			</div>
		</div>
	);
}

export default App;
