import { apiClient } from '@/app/lib/apiclient';
import { Turno, User } from '@/app/api/types';
import useSWR from 'swr';

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR<User[]>(
    '/users',
    () => apiClient.get<User[]>('/users')
  );

  const createUser = async (user: Omit<User, 'id'>) => {
    const newUser = await apiClient.post<User>('/users', user);
    mutate([...(data || []), newUser], false);
    return newUser;
  };

  const updateUser = async (id: string, user: Partial<User>) => {
    const updated = await apiClient.put<User>(`/users/${id}`, user);
    mutate(
      data?.map((u) => (u.id === id ? updated : u)),
      false
    );
    return updated;
  };

  const deleteUser = async (id: string) => {
    await apiClient.delete(`/users/${id}`);
    mutate(
      data?.filter((u) => u.id !== id),
      false
    );
  };

  return {
    users: data,
    isLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
    mutate,
  };
}