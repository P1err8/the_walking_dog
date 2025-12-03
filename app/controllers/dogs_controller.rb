class DogsController < ApplicationController


  # def index
  #   @dogs = Dog.all
  #   if params[:query].present?
  #     @dogs = @dogs.where(breed: params[:query])
  #   end
  # end
  def show
    @dog = Dog.find(current_user.dogs.first.id)
  end

  def new
    @dog = Dog.new
  end

  def create
    raise
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
