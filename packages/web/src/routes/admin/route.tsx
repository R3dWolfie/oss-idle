import {
	createFileRoute,
	Outlet,
} from '@tanstack/react-router';
import AdminNav from '../../pages/admin/AdminNav';

export const Route = createFileRoute('/admin')({ component: AdminLayout });

function AdminLayout() {
	return <>
		<AdminNav />
		<Outlet />
	</>;
}
