import { endpoints } from '@/app/api/endpoints';
import { deleter, fetcher, poster, putter } from '@/app/api/fetcher';
import { Turno, User } from '@/app/api/types';
import useSWR from 'swr';

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR<User[]>(
    endpoints.users.list(),
    fetcher
  );

  const createUser = async (user: Omit<User, 'id'>) => {
    const newUser = await poster<User>(
      endpoints.users.create(),
      user
    );
    mutate([...(data || []), newUser], false);
    return newUser;
  };

  const updateUser = async (id: string, user: Partial<User>) => {
    const updated = await putter<User>(
      endpoints.users.update(id),
      user
    );
    mutate(
      data?.map((u) => (u.id === id ? updated : u)),
      false
    );
    return updated;
  };

  const deleteUser = async (id: string) => {
    await deleter(endpoints.users.delete(id));
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