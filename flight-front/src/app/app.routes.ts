import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: 'flights',
		loadComponent: () =>
			import('./features/flights/pages/flight-search/flight-search').then(
				(component) => component.FlightSearch,
			),
	},
	{
		path: 'flights/:flightId/seats',
		loadComponent: () =>
			import('./features/flights/pages/flight-seat-map/flight-seat-map').then(
				(component) => component.FlightSeatMap,
			),
	},
	{
		path: 'reservations',
		loadComponent: () =>
			import('./features/reservations/pages/reservation/reservation').then(
				(component) => component.Reservation,
			),
	},
	{ path: '', pathMatch: 'full', redirectTo: 'flights' },
	{ path: '**', redirectTo: 'flights' },
];
