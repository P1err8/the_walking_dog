class DogsController < ApplicationController

  def new
    @dog = Dog.new
  end

  def create
    @dog = Dog.new(dog_params)
    if @dog.save
      redirect_to @dog
    else
      render :new, status: :unprocessable_entity
    end
  end

  private

  def dog_params
    params.require(:dog).permit(:name, :age, :breed)
  end

end
