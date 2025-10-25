import { User } from "@/app/api/types" 
import useSWR from "swr"

export default function useUser() {
	const { data, mutate, error } = useSWR<User | null>(`/user`)

	const loading = !data && !error
	const loggedOut = error && error.response?.status === 401

	return {
		loading,
		loggedOut,
		data,
		error,
		mutate
	}
 
}
